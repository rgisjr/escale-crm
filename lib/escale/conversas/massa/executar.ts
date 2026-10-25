import type { SupabaseClient } from "@supabase/supabase-js";

import type { HandlerCtx } from "@/lib/api/handlers/types";
import { normalizarTags } from "@/lib/contacts/tag-normalizada";
import type { EventRow, HandlerResult } from "@/lib/event-log/dispatcher";

import type { AcaoDaFila } from "../acoes-em-massa-da-fila";
import { camposParaEntrarEmEspera, camposParaSairDaEspera } from "../espera";

/**
 * O EXECUTOR DAS AÇÕES EM MASSA DA FILA (fork Escale, Fase 3D; N14–N16). Roda com
 * o service role, mas só sobre as conversas que `fn_escale_criar_acao_em_massa_de_conversas`
 * resolveu com a RLS de quem pediu. Cada conversa recebe o mesmo que a tela faz.
 * Lotes de 100, 20 s por rodada (como a 2B); o lote é marcado feito ANTES de agir.
 */
export const CONSUMIDOR_DA_MASSA_DA_FILA = "escale-acao-em-massa-conversas.v1";
export const LOTE = 100;
export const ORCAMENTO_MS = 20_000;
const ERROS_GUARDADOS = 50;
const TENTATIVAS_ANTES_DE_DESISTIR = 4;
const TAGS_DO_CONTATO_MAX = 20;
const FECHADOS = ["closed", "resolved"];

export type DependenciasDaMassa = {
  db: SupabaseClient;
  agora: () => number;
  mudarContato: (ctx: HandlerCtx, id: string, input: { tags: string[] }) => Promise<unknown>;
  transferirSetor: (
    db: SupabaseClient,
    orgId: string,
    conversa: { id: string; channel_session_id: string; assigned_to_user_id: string | null },
    destino: string,
    userId: string,
  ) => Promise<"transferida" | "mesmo_setor">;
};

type Acao = {
  id: string;
  organization_id: string;
  user_id: string;
  acao: AcaoDaFila;
  parametros: Record<string, unknown>;
  status: string;
  total: number;
  feitos: number;
  falhas: number;
  erros: Array<{ conversa: string | null; motivo: string }>;
};
type Conversa = {
  id: string;
  organization_id: string;
  status: string;
  service_revision: number;
  assigned_to_user_id: string | null;
  snooze_until: string | null;
  metadata: Record<string, unknown> | null;
  contact_id: string | null;
  channel_session_id: string;
};

const resultado = (
  status: HandlerResult["status"],
  detail?: string,
  retry_at?: string,
): HandlerResult => ({
  consumer_key: CONSUMIDOR_DA_MASSA_DA_FILA,
  status,
  ...(detail ? { detail } : {}),
  ...(retry_at ? { retry_at } : {}),
});

const emEspera = (c: Conversa, agora: number) =>
  !!c.snooze_until && Date.parse(c.snooze_until) > agora;

async function evento(db: SupabaseClient, c: Conversa, tipo: string, userId: string) {
  const { error } = await db
    .from("crm_eventos_da_conversa")
    .insert({ organization_id: c.organization_id, conversation_id: c.id, tipo, user_id: userId });
  if (error) throw new Error(error.message);
}

async function mudarStatus(db: SupabaseClient, c: Conversa, status: "open" | "closed") {
  const { error } = await db.rpc("fn_service_status", {
    p_org: c.organization_id,
    p_conversation: c.id,
    p_status: status,
    p_expected: c.service_revision,
  });
  if (error) throw new Error(error.message);
}

async function atualizar(db: SupabaseClient, c: Conversa, campos: Record<string, unknown>) {
  const { error } = await db
    .from("conversations")
    .update(campos)
    .eq("organization_id", c.organization_id)
    .eq("id", c.id);
  if (error) throw new Error(error.message);
}

async function agirNoStatus(acao: Acao, c: Conversa, deps: DependenciasDaMassa) {
  const alvo = acao.parametros.status as "em_aberto" | "fechado" | "em_espera";
  const fechada = FECHADOS.includes(c.status);
  if (alvo === "fechado") {
    if (fechada) return;
    await mudarStatus(deps.db, c, "closed");
    await evento(deps.db, c, "encerrado", acao.user_id);
    return;
  }
  if (fechada) {
    await mudarStatus(deps.db, c, "open");
    await evento(deps.db, c, "reaberto", acao.user_id);
  }
  if (alvo === "em_aberto") {
    if (!emEspera(c, deps.agora())) return;
    await atualizar(deps.db, c, camposParaSairDaEspera(c.metadata));
    await evento(deps.db, c, "espera_removida", acao.user_id);
    return;
  }
  if (emEspera(c, deps.agora())) return;
  await atualizar(
    deps.db,
    c,
    camposParaEntrarEmEspera(acao.user_id, new Date(deps.agora()), c.metadata),
  );
  await evento(deps.db, c, "espera", acao.user_id);
}

async function agirNoAtendente(acao: Acao, c: Conversa, deps: DependenciasDaMassa) {
  const destino = (acao.parametros.user_id as string | null) ?? null;
  if (c.assigned_to_user_id === destino) return;
  const { error } = await deps.db.rpc("fn_conversation_assign", {
    p_organization_id: c.organization_id,
    p_conversation_id: c.id,
    p_to_user_id: destino as unknown as string,
    p_reason: destino ? "transfer" : "release",
    p_expected_assignee: null as unknown as string,
    p_enforce_expected: false,
  });
  if (error) throw new Error(error.message);
}

async function agirNaTag(
  acao: Acao,
  c: Conversa,
  deps: DependenciasDaMassa,
  feitosNoLote: Set<string>,
) {
  if (!c.contact_id || feitosNoLote.has(c.contact_id)) return;
  feitosNoLote.add(c.contact_id);
  const tag = normalizarTags([String(acao.parametros.tag ?? "")])[0];
  if (!tag) throw new Error("Tag inválida.");
  const { data, error } = await deps.db
    .from("contacts")
    .select("id, tags")
    .eq("organization_id", c.organization_id)
    .eq("id", c.contact_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const atuais = normalizarTags(
    ((data as { tags?: string[] | null } | null)?.tags ?? []) as string[],
  );
  const ctx: HandlerCtx = {
    organization_id: acao.organization_id,
    actor: { type: "user", id: acao.user_id },
    requestId: acao.id,
  };
  if (acao.acao === "incluir_tag") {
    if (atuais.includes(tag)) return;
    if (atuais.length >= TAGS_DO_CONTATO_MAX) throw new Error("O contato já tem 20 tags.");
    await deps.mudarContato(ctx, c.contact_id, { tags: [...atuais, tag] });
    return;
  }
  if (!atuais.includes(tag)) return;
  await deps.mudarContato(ctx, c.contact_id, { tags: atuais.filter((x) => x !== tag) });
}

async function agir(
  acao: Acao,
  c: Conversa | undefined,
  deps: DependenciasDaMassa,
  contatosDoLote: Set<string>,
) {
  if (!c) throw new Error("Conversa não encontrada.");
  if (c.status === "archived") throw new Error("A conversa está arquivada.");
  if (acao.acao === "status") return agirNoStatus(acao, c, deps);
  if (acao.acao === "atendente") return agirNoAtendente(acao, c, deps);
  if (acao.acao === "setor") {
    await deps.transferirSetor(
      deps.db,
      c.organization_id,
      c,
      String(acao.parametros.setor_id),
      acao.user_id,
    );
    return;
  }
  return agirNaTag(acao, c, deps, contatosDoLote);
}

async function emLotes(acao: Acao, deps: DependenciasDaMassa): Promise<HandlerResult> {
  const inicio = deps.agora();
  let feitos = acao.feitos;
  let falhas = acao.falhas;
  const erros = [...acao.erros];
  while (deps.agora() - inicio < ORCAMENTO_MS) {
    const { data, error } = await deps.db
      .from("crm_acoes_em_massa_conversas_itens")
      .select("conversation_id")
      .eq("acao_id", acao.id)
      .eq("feito", false)
      .order("posicao", { ascending: true })
      .limit(LOTE);
    if (error) throw new Error(error.message);
    const ids = ((data ?? []) as Array<{ conversation_id: string }>).map((i) => i.conversation_id);
    if (ids.length === 0) {
      const fim = await deps.db
        .from("crm_acoes_em_massa_conversas")
        .update({ status: "concluida", feitos, falhas, erros })
        .eq("id", acao.id);
      // Sem conferir, a ação ficava "processando" para sempre e a tela esperava sem fim.
      if (fim.error) throw new Error(fim.error.message);
      return resultado("ok");
    }
    const marcado = await deps.db
      .from("crm_acoes_em_massa_conversas_itens")
      .update({ feito: true })
      .eq("acao_id", acao.id)
      .in("conversation_id", ids);
    if (marcado.error) throw new Error(marcado.error.message);
    const lidas = await deps.db
      .from("conversations")
      .select(
        "id, organization_id, status, service_revision, assigned_to_user_id, snooze_until, metadata, contact_id, channel_session_id",
      )
      .eq("organization_id", acao.organization_id)
      .in("id", ids);
    if (lidas.error) throw new Error(lidas.error.message);
    const porId = new Map(((lidas.data ?? []) as Conversa[]).map((c) => [c.id, c]));
    const contatosDoLote = new Set<string>();
    for (const id of ids) {
      try {
        await agir(acao, porId.get(id), deps, contatosDoLote);
        feitos += 1;
      } catch (e) {
        falhas += 1;
        if (erros.length < ERROS_GUARDADOS)
          erros.push({ conversa: id, motivo: e instanceof Error ? e.message : String(e) });
      }
    }
    await deps.db
      .from("crm_acoes_em_massa_conversas")
      .update({ feitos, falhas, erros })
      .eq("id", acao.id);
  }
  return resultado("retry", "orcamento", new Date(deps.agora() + 1000).toISOString());
}

export async function processarAcaoDaFila(
  row: EventRow,
  deps: DependenciasDaMassa,
): Promise<HandlerResult> {
  const acaoId = typeof row.payload?.acao_id === "string" ? row.payload.acao_id : null;
  if (!acaoId) return resultado("skipped", "sem_acao_id");
  const { data, error } = await deps.db
    .from("crm_acoes_em_massa_conversas")
    .select("id, organization_id, user_id, acao, parametros, status, total, feitos, falhas, erros")
    .eq("id", acaoId)
    .eq("organization_id", row.organization_id)
    .maybeSingle();
  if (error) return resultado("error", error.message);
  if (!data) return resultado("skipped", "acao_inexistente");
  const acao = data as Acao;
  if (acao.status === "concluida" || acao.status === "falhou")
    return resultado("ok", "ja_terminada");
  if (acao.status !== "na_fila" && acao.status !== "processando")
    return resultado("skipped", "fora_da_fila");
  if (acao.status !== "processando") {
    const inicio = await deps.db
      .from("crm_acoes_em_massa_conversas")
      .update({ status: "processando" })
      .eq("id", acao.id);
    if (inicio.error) return resultado("error", inicio.error.message);
  }
  try {
    return await emLotes(acao, deps);
  } catch (e) {
    const motivo = e instanceof Error ? e.message : String(e);
    if (row.attempts >= TENTATIVAS_ANTES_DE_DESISTIR) {
      await deps.db
        .from("crm_acoes_em_massa_conversas")
        .update({
          status: "falhou",
          erros: [...acao.erros, { conversa: null, motivo }].slice(-ERROS_GUARDADOS),
        })
        .eq("id", acao.id);
      return resultado("ok", "falhou");
    }
    return resultado("error", motivo);
  }
}
