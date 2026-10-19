import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { autorizaCron } from "@/lib/auth/cron-auth";
import { enviarAgendada } from "@/lib/escale/conversas/envio-agendado";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const LOTE = 50;

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
  const { data, error } = await admin
    .from("crm_mensagens_agendadas")
    .select(
      "id, organization_id, conversation_id, criado_por, tipo, corpo, template, " +
        "conversations:conversation_id ( last_inbound_at ), channel_sessions:channel_session_id ( status, provider )",
    )
    .eq("status", "pendente")
    .lte("enviar_em", agora.toISOString())
    .order("enviar_em", { ascending: true })
    .limit(LOTE);
  if (error) return fail("internal_error", error.message, 500, { requestId });

  let enviadas = 0;
  let falhas = 0;
  for (const v of (data ?? []) as unknown as Vencida[]) {
    const { data: minha } = await admin
      .from("crm_mensagens_agendadas")
      .update({ status: "processando" })
      .eq("id", v.id)
      .eq("status", "pendente")
      .select("id")
      .maybeSingle();
    if (!minha) continue; // outro tick levou
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
    await admin
      .from("crm_mensagens_agendadas")
      .update(
        resultado.status === "enviada"
          ? {
              status: "enviada",
              message_id: resultado.message_id,
              enviada_em: new Date().toISOString(),
              erro: null,
            }
          : { status: "falhou", erro: resultado.erro },
      )
      .eq("id", v.id);
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
  return ok({ enviadas, falhas }, { requestId });
}

export async function GET(req: NextRequest): Promise<Response> {
  return handle(req);
}
export async function POST(req: NextRequest): Promise<Response> {
  return handle(req);
}
