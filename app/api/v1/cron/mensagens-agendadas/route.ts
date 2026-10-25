import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { autorizaCron } from "@/lib/auth/cron-auth";
import { enviarAgendada } from "@/lib/escale/conversas/envio-agendado";
import { logger } from "@/lib/logger";
import { ehOperante, STATUS_OPERANTE, statusDaOrgEmbutida } from "@/lib/organizacao/operante";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const LOTE = 50;
/** Quanto tempo uma linha pode ficar em `processando` antes de ser dada como presa. */
const PRESA_APOS_MINUTOS = 15;
const TENTATIVAS_DO_DESFECHO = 2;

interface Vencida {
  id: string;
  organization_id: string;
  conversation_id: string;
  criado_por: string;
  tipo: "texto" | "template";
  corpo: string | null;
  template: { name: string; language: string; values: Record<string, string> } | null;
  conversations: { last_inbound_at: string | null } | null;
  channel_sessions: { status: string; provider: string | null } | null;
  organizations: { status?: string | null } | Array<{ status?: string | null }> | null;
}

type Admin = ReturnType<typeof createAdminClient>;
type Resultado = Awaited<ReturnType<typeof enviarAgendada>>;

/** Reivindica, envia e grava o desfecho; null quando outro tick já levou a linha. */
async function processarVencida(
  admin: Admin,
  v: Vencida,
  agora: Date,
  requestId: string,
): Promise<Resultado | null> {
  const { data: minha } = await admin
    .from("crm_mensagens_agendadas")
    .update({ status: "processando" })
    .eq("id", v.id)
    .eq("status", "pendente")
    .select("id")
    .maybeSingle();
  if (!minha) return null;
  const resultado = await enviarAgendada(
    admin,
    {
      id: v.id,
      organization_id: v.organization_id,
      conversation_id: v.conversation_id,
      criado_por: v.criado_por,
      tipo: v.tipo,
      corpo: v.corpo,
      template: v.template,
      canal: {
        status: v.channel_sessions?.status ?? "STOPPED",
        provider: v.channel_sessions?.provider ?? null,
      },
      lastInboundAt: v.conversations?.last_inbound_at ?? null,
    },
    agora,
    requestId,
  );
  const desfecho =
    resultado.status === "enviada"
      ? {
          status: "enviada",
          message_id: resultado.message_id,
          enviada_em: new Date().toISOString(),
          erro: null,
        }
      : { status: "falhou", erro: resultado.erro };
  // O envio JÁ aconteceu: perder só o registro deixaria a linha presa e a
  // mensagem sem aparecer como enviada. Uma segunda tentativa cobre o soluço.
  let falhaDoDesfecho: string | null = null;
  for (let i = 0; i < TENTATIVAS_DO_DESFECHO; i++) {
    const { error } = await admin.from("crm_mensagens_agendadas").update(desfecho).eq("id", v.id);
    falhaDoDesfecho = error ? error.message : null;
    if (!falhaDoDesfecho) break;
  }
  if (falhaDoDesfecho)
    logger.error("cron mensagens-agendadas: desfecho não gravado", {
      agendamento: v.id,
      status: resultado.status,
      error: falhaDoDesfecho,
    });
  return resultado;
}

/**
 * Linha em `processando` há mais de PRESA_APOS_MINUTOS: o processo caiu entre o
 * envio e o registro (ex.: deploy). Não há como saber se a mensagem saiu, então
 * NÃO volta para `pendente` (reenviaria uma mensagem possivelmente já entregue
 * ao cliente): vai para `falhou`, com o motivo, e a pessoa decide reenviar.
 */
async function soltarPresas(admin: Admin, agora: Date): Promise<number> {
  const corte = new Date(agora.getTime() - PRESA_APOS_MINUTOS * 60_000).toISOString();
  const { data, error } = await admin
    .from("crm_mensagens_agendadas")
    .update({
      status: "falhou",
      erro: "Envio interrompido: não foi possível confirmar se a mensagem saiu. Confira a conversa antes de reenviar.",
    })
    .eq("status", "processando")
    .lt("updated_at", corte)
    .select("id");
  if (error) {
    logger.error("cron mensagens-agendadas: presas não liberadas", { error: error.message });
    return 0;
  }
  return (data ?? []).length;
}

/**
 * FORK ESCALE · Fase 3B (C9): envia as mensagens agendadas vencidas. Minuto a
 * minuto no docker/scheduler/entrypoint.sh. Reivindica cada linha
 * (`pendente` → `processando`, só se ainda pendente) antes de enviar, para
 * dois ticks não mandarem a mesma mensagem.
 */
async function handle(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  if (!autorizaCron(req))
    return fail("forbidden", "Cron secret missing or invalid.", 403, { requestId });
  const admin = createAdminClient();
  const agora = new Date();
  const presas = await soltarPresas(admin, agora);
  const { data, error } = await admin
    .from("crm_mensagens_agendadas")
    .select(
      "id, organization_id, conversation_id, criado_por, tipo, corpo, template, " +
        "conversations:conversation_id ( last_inbound_at ), channel_sessions:channel_session_id ( status, provider ), " +
        "organizations:organization_id!inner ( status )",
    )
    .eq("status", "pendente")
    // Organização parada não envia e a agendada espera a volta. O corte sai no
    // banco, ANTES do limit: filtrar depois deixaria 50 agendadas de uma
    // organização parada travarem o envio de todas as outras.
    .eq("organizations.status", STATUS_OPERANTE)
    .lte("enviar_em", agora.toISOString())
    .order("enviar_em", { ascending: true })
    .limit(LOTE);
  if (error) return fail("internal_error", error.message, 500, { requestId });

  let enviadas = 0;
  let falhas = 0;
  for (const v of (data ?? []) as unknown as Vencida[]) {
    if (!ehOperante(statusDaOrgEmbutida(v.organizations))) continue; // cinto
    const resultado = await processarVencida(admin, v, agora, requestId);
    // null = outro tick levou: sem efeito, sem trilha.
    if (resultado) {
      if (resultado.status === "enviada") enviadas++;
      else falhas++;
      void audit({
        action: "conversation_message.schedule_sent",
        actorUserId: v.criado_por,
        organizationId: v.organization_id,
        resourceType: "conversation",
        resourceId: v.conversation_id,
        requestId,
        metadata: { agendamento: v.id, ...resultado },
      });
    }
  }
  return ok({ enviadas, falhas, presas }, { requestId });
}

export async function GET(req: NextRequest): Promise<Response> {
  return handle(req);
}
export async function POST(req: NextRequest): Promise<Response> {
  return handle(req);
}
