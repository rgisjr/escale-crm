/**
 * POST /api/v1/acoes-em-massa-conversas — pedir uma ação em massa sobre a fila
 * (fork Escale, Fase 3D; B8; N13–N15). A permissão "Ações em massa" é conferida
 * aqui e de novo no banco. Até LIMITE_IMEDIATO conversas, executa na hora.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { LIMITE_IMEDIATO, pedidoDaFilaSchema } from "@/lib/escale/conversas/acoes-em-massa-da-fila";
import { compilarFiltrosDaFila } from "@/lib/escale/conversas/compilar-filtros-da-fila";
import { painelDoTexto } from "@/lib/escale/conversas/filtros-da-fila";
import { processarAcaoDaFila } from "@/lib/escale/conversas/massa/executar";
import { dependenciasReais } from "@/lib/escale/conversas/massa/handler";
import { pode } from "@/lib/escale/conversas/setores-banco";
import { lerJson } from "@/lib/escale/origens/respostas";
import type { EventRow } from "@/lib/event-log/dispatcher";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("agent", { requestId, resource: "crm_acoes_em_massa_conversas" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const recusa = (texto: string, status = 422) =>
    fail(status === 403 ? "forbidden" : "unprocessable_entity", t(texto), status, { requestId });
  const orgId = authz.org.orgId;

  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = pedidoDaFilaSchema.safeParse(corpo.json);
  if (!lido.success) return recusa("Ocorreu um erro ao executar a ação em massa!");
  const { acao, alvo, parametros } = lido.data;

  try {
    const supabase = await createClient();
    if (!(await pode(supabase, orgId, "CHAT_BULK_ACTIONS")))
      return recusa("Sem permissão para ações em massa.", 403);
    // Trocar ou soltar o atendente em lote passa por cima das permissões de
    // atendente (o executor grava como serviço). Sem a de "todos", não vale.
    if (acao === "atendente" && !(await pode(supabase, orgId, "CHAT_CHANGE_ATTENDANT_ALL")))
      return recusa("Sem permissão para alterar o atendente das conversas.", 403);
    if (acao === "atendente" && parametros.user_id) {
      const { data: membro } = await createAdminClient()
        .from("user_organizations")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", parametros.user_id)
        .is("revoked_at", null)
        .maybeSingle();
      if (!membro || (membro as { role: string }).role === "viewer")
        return recusa("Destino não é um atendente desta organização.");
    }
    if (acao === "setor") {
      const { data: setor } = await supabase
        .from("crm_setores")
        .select("id")
        .eq("organization_id", orgId)
        .eq("id", parametros.setor_id)
        .maybeSingle();
      if (!setor) return recusa("Setor não encontrado.");
    }
    let filtros: Record<string, unknown> | null = null;
    if (alvo.tipo === "filtro") {
      const painel = painelDoTexto(alvo.f);
      if (painel === null) return recusa("Ocorreu um erro ao executar a ação em massa!");
      filtros = compilarFiltrosDaFila(painel, alvo.q, await fusoDaOrganizacao(supabase, orgId));
    }
    const { data, error } = await supabase.rpc("fn_escale_criar_acao_em_massa_de_conversas", {
      p_org: orgId,
      p_acao: acao,
      p_parametros: parametros,
      p_ids: alvo.tipo === "ids" ? alvo.ids : null,
      p_filtros: filtros,
      p_quantidade: alvo.tipo === "filtro" ? alvo.quantidade : null,
      p_excluidos: alvo.tipo === "filtro" ? alvo.excluidos : null,
      p_imediato_ate: LIMITE_IMEDIATO,
    });
    if (error) {
      const m = error.message ?? "";
      if (m.includes("acao_em_massa_vazia"))
        return recusa("É preciso selecionar ao menos um Chat para realizar ações em massa!");
      if (m.includes("acao_em_massa_grande_demais"))
        return recusa("No máximo 100.000 conversas por ação.");
      if (m.includes("acao_em_massa_sem_permissao"))
        return recusa("Sem permissão para ações em massa.", 403);
      return fail("internal_error", m, 500, { requestId });
    }
    const linha = (
      (data ?? []) as Array<{ acao_id: string; quantidade: number; status: string }>
    )[0];
    if (!linha)
      return recusa("É preciso selecionar ao menos um Chat para realizar ações em massa!");
    void audit({
      action: "conversations.bulk_requested",
      actorUserId: authz.user.id,
      organizationId: orgId,
      resourceType: "crm_acoes_em_massa_conversas",
      resourceId: linha.acao_id,
      requestId,
      metadata: { acao, total: linha.quantidade, alvo: alvo.tipo },
    });

    if (linha.quantidade > LIMITE_IMEDIATO)
      return ok(
        { id: linha.acao_id, total: linha.quantidade, status: "na_fila" },
        { status: 201, requestId },
      );
    // N15: na hora, com o mesmo executor. Falhou no meio: o evento entrega ao consumidor.
    const sintetico = {
      id: requestId,
      organization_id: orgId,
      event_type: "conversas.acao_em_massa_requested",
      entity_kind: "crm_acao_em_massa_conversas",
      entity_id: linha.acao_id,
      payload: { acao_id: linha.acao_id },
      metadata: {},
      consumed_by: [],
      attempts: 0,
    } as unknown as EventRow;
    const fim = await processarAcaoDaFila(sintetico, dependenciasReais());
    if (fim.status !== "ok") {
      logger.warn(
        "acoes-em-massa-conversas: o caminho imediato não terminou; entregando ao consumidor",
        { organization_id: orgId, acao_id: linha.acao_id, detail: fim.detail ?? fim.status },
      );
      await createAdminClient().rpc("emit_event", {
        p_event_type: "conversas.acao_em_massa_requested",
        p_entity_kind: "crm_acao_em_massa_conversas",
        p_entity_id: linha.acao_id,
        p_payload: { acao_id: linha.acao_id },
        p_metadata: {},
        p_organization_id: orgId,
      });
      return ok(
        { id: linha.acao_id, total: linha.quantidade, status: "processando" },
        { status: 201, requestId },
      );
    }
    return ok(
      { id: linha.acao_id, total: linha.quantidade, status: "concluida" },
      { status: 201, requestId },
    );
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
