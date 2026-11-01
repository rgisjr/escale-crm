import type { SupabaseClient } from "@supabase/supabase-js";

import type { AutomationRuleRunActionResult, AutomationRunStatus } from "@/hooks/webhooks/useAutomationRules";

import type { PedidoDeExecucoes } from "./schema";
import type { LinhaDaExecucao, PassoDoResumo, ResumoDaAutomacao } from "./tipos";

/**
 * OS INSIGHTS NO BANCO (fork Escale, Fase 5C) — servidor, sempre com a sessão de quem
 * pede: as duas funções da 9707 são `security invoker`, então a RLS decide o que se vê.
 * O papel (gerente) é conferido na rota.
 */
export interface RegraDosInsights {
  id: string;
  name: string;
  actions: { type: string }[];
}

/** `{ id, name, actions }` da regra na organização da sessão; null se não houver (rota → 404). */
export async function regraDaOrganizacao(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
): Promise<RegraDosInsights | null> {
  const { data, error } = await supabase
    .from("automation_rules")
    .select("id, name, actions")
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const linha = data as { id: string; name: string; actions: unknown };
  return { id: linha.id, name: linha.name, actions: Array.isArray(linha.actions) ? (linha.actions as { type: string }[]) : [] };
}

/** O `jsonb` pode trazer a contagem como número ou como texto. */
const numero = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export async function lerResumo(
  supabase: SupabaseClient,
  id: string,
  desde: string | null,
): Promise<ResumoDaAutomacao> {
  const { data, error } = await supabase.rpc("fn_escale_resumo_da_automacao", { p_regra: id, p_desde: desde });
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as Record<string, unknown>;
  const passos = Array.isArray(r.passos) ? (r.passos as Record<string, unknown>[]) : [];
  return {
    total: numero(r.total),
    sucesso: numero(r.sucesso),
    parcial: numero(r.parcial),
    falhou: numero(r.falhou),
    adiado: numero(r.adiado),
    ultima: typeof r.ultima === "string" ? r.ultima : null,
    passos: passos.map(
      (p): PassoDoResumo => ({
        indice: numero(p.indice),
        tipo: String(p.tipo ?? ""),
        sucesso: numero(p.sucesso),
        erro: numero(p.erro),
        esperando: numero(p.esperando),
      }),
    ),
  };
}

function linhaDaExecucao(l: Record<string, unknown>): LinhaDaExecucao {
  const contatoId = typeof l.contato_id === "string" ? l.contato_id : null;
  const negocioId = typeof l.negocio_id === "string" ? l.negocio_id : null;
  return {
    id: String(l.id),
    status: l.status as AutomationRunStatus,
    criadaEm: String(l.created_at),
    eventoId: typeof l.event_id === "string" ? l.event_id : null,
    resultados: Array.isArray(l.actions_result) ? (l.actions_result as AutomationRuleRunActionResult[]) : [],
    contato: contatoId
      ? {
          id: contatoId,
          nome: typeof l.contato_nome === "string" ? l.contato_nome : "",
          telefone: typeof l.contato_telefone === "string" ? l.contato_telefone : null,
          email: typeof l.contato_email === "string" ? l.contato_email : null,
          temFoto: l.contato_tem_foto === true,
        }
      : null,
    negocio: negocioId ? { id: negocioId, titulo: typeof l.negocio_titulo === "string" ? l.negocio_titulo : "" } : null,
  };
}

export async function lerExecucoes(
  supabase: SupabaseClient,
  id: string,
  pedido: PedidoDeExecucoes,
): Promise<{ total: number; linhas: LinhaDaExecucao[] }> {
  const { data, error } = await supabase.rpc("fn_escale_execucoes_da_automacao", {
    p_regra: id,
    p_desde: pedido.desde,
    p_situacoes: pedido.situacoes,
    p_passos: pedido.acoes?.map((a) => a.indice) ?? null,
    p_tipos: pedido.acoes?.map((a) => a.tipo) ?? null,
    p_resultados: pedido.resultados,
    p_busca: pedido.busca,
    p_limite: pedido.limite,
    p_deslocamento: pedido.deslocamento,
  });
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as { total?: unknown; linhas?: unknown };
  const linhas = Array.isArray(r.linhas) ? (r.linhas as Record<string, unknown>[]) : [];
  return { total: numero(r.total), linhas: linhas.map(linhaDaExecucao) };
}
