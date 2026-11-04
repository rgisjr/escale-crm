/**
 * FORK ESCALE · 5D: grava e publica, juntos, uma automação em MODO FLUXO (servidor).
 *
 * A regra (`automation_rules`) fica só com o gatilho, o filtro inicial e UMA ação `start_message_flow`.
 * O resto do desenho vira o grafo de um fluxo de follow-up escondido (`surface = 'crm_automation'`),
 * que é o motor que já espera, retoma e ramifica. Ordem: fluxo (cria, salva, publica) e só então a
 * regra — se a publicação for recusada a regra não é tocada; se a regra falhar depois, o fluxo
 * publicado fica sem regra nova, o que é inofensivo (só a regra inscreve).
 */
import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Actor } from "@/lib/api/handlers/types";
import { falhaDeEscrita, type ResultadoDeEscrita } from "@/lib/api/resultado-de-escrita";
import { atualizarRegra, criarRegra } from "@/lib/automation/regras-escrita";
import type { CorpoDaRegra, RegraGravada } from "@/lib/automation/desenho-da-regra";
import { criarFluxo, publicarFluxo, salvarFluxo } from "@/lib/followup/escrita-de-fluxo";
import { flowGraphSchema, type FlowGraph } from "@/lib/followup/graph-schema";
import { createAutomationRuleSchema, MENSAGEM_DA_VERSAO_VELHA } from "@/lib/schemas/webhooks";

export const PONTEIRO_DA_AUTOMACAO = (chave: string): string => `Automação ${chave}`;
const ACAO_DO_FLUXO = "start_message_flow" as const;

export interface DepsDaGravacao {
  criarFluxo: typeof criarFluxo;
  salvarFluxo: typeof salvarFluxo;
  publicarFluxo: typeof publicarFluxo;
  atualizarRegra: typeof atualizarRegra;
  criarRegra: typeof criarRegra;
  /** Apaga um ponteiro recém-criado quando a publicação é recusada (nunca tocou numa regra). */
  descartarFluxo: (db: SupabaseClient, organizationId: string, pointerId: string) => Promise<void>;
}

export const DEPS_REAIS: DepsDaGravacao = {
  criarFluxo,
  salvarFluxo,
  publicarFluxo,
  atualizarRegra,
  criarRegra,
  descartarFluxo: async (db, organizationId, pointerId) => {
    await db.from("followup_flow_pointers").delete().eq("id", pointerId).eq("organization_id", organizationId);
  },
};

export interface EntradaDaGravacao {
  organizationId: string;
  /** `null` = automação nova. */
  ruleId: string | null;
  regra: Omit<CorpoDaRegra, "actions">;
  grafo: FlowGraph;
  /** `updated_at` lido pela tela (controle de conflito); só em automação existente. */
  versaoDaRegra?: string;
  actor: Extract<Actor, { type: "user" }>;
  /** Nome de quem salvou: publicar a automação na tela é o ato humano. */
  aprovadoPor: string;
  requestId: string;
}

type Lida = { regra: RegraGravada; pointerId: string | null };

async function lerRegra(db: SupabaseClient, organizationId: string, ruleId: string): Promise<Lida | null> {
  const { data } = await db
    .from("automation_rules")
    .select("*")
    .eq("id", ruleId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!data) return null;
  const regra = data as RegraGravada;
  const acoes = (regra.actions ?? []) as Array<{ type?: string; config?: { flow_pointer_id?: unknown } }>;
  const acao = acoes.length === 1 && acoes[0]?.type === ACAO_DO_FLUXO ? acoes[0] : null;
  const id = acao?.config?.flow_pointer_id;
  if (typeof id !== "string") return { regra, pointerId: null };
  const { data: ponteiro } = await db
    .from("followup_flow_pointers")
    .select("id")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .eq("surface", "crm_automation")
    .maybeSingle();
  return { regra, pointerId: ponteiro ? (ponteiro as { id: string }).id : null };
}

/** O fluxo escondido de uma automação em modo fluxo; `null` quando a regra não está nesse modo. */
export async function lerAutomacaoEmModoFluxo(
  db: SupabaseClient,
  entrada: { organizationId: string; ruleId: string },
): Promise<{ regra: RegraGravada; grafo: FlowGraph; pointerId: string } | null> {
  const lida = await lerRegra(db, entrada.organizationId, entrada.ruleId);
  if (!lida?.pointerId) return null;
  const { data } = await db
    .from("followup_flow_pointers")
    .select("draft_graph")
    .eq("id", lida.pointerId)
    .eq("organization_id", entrada.organizationId)
    .maybeSingle();
  const grafo = flowGraphSchema.safeParse((data as { draft_graph?: unknown } | null)?.draft_graph);
  if (!grafo.success) return null;
  return { regra: lida.regra, grafo: grafo.data, pointerId: lida.pointerId };
}

type Resultado = ResultadoDeEscrita<{ ruleId: string; pointerId: string; atualizadoEm: string | null }>;

const quando = (regra: Record<string, unknown>): string | null => (typeof regra.updated_at === "string" ? regra.updated_at : null);

export async function gravarAutomacaoEmModoFluxo(
  db: SupabaseClient,
  admin: SupabaseClient,
  entrada: EntradaDaGravacao,
  deps: DepsDaGravacao = DEPS_REAIS,
): Promise<Resultado> {
  const { organizationId, actor, requestId } = entrada;
  const autor = { userId: actor.id };
  // A regra passa pelo MESMO schema da rota ANTES de qualquer escrita: gatilho inválido não deixa fluxo publicado.
  const ponteiroDeValidacao = "00000000-0000-4000-8000-000000000000";
  const conferida = createAutomationRuleSchema.safeParse({
    ...entrada.regra,
    actions: [{ type: ACAO_DO_FLUXO, config: { flow_pointer_id: ponteiroDeValidacao } }],
  });
  if (!conferida.success) {
    return falhaDeEscrita("validation_failed", conferida.error.issues[0]?.message ?? "Revise a configuração do gatilho.", 422);
  }
  let pointerId: string | null = null;
  let regraGravada: Lida["regra"] | null = null;
  if (entrada.ruleId) {
    const lida = await lerRegra(db, organizationId, entrada.ruleId);
    if (!lida) return falhaDeEscrita("not_found", "Regra não encontrada.", 404);
    regraGravada = lida.regra;
    pointerId = lida.pointerId;
    // A versão velha se recusa ANTES de publicar: depois, o grafo velho já estaria no ar.
    const versaoGravada = (lida.regra as unknown as { updated_at?: unknown }).updated_at;
    if (entrada.versaoDaRegra && typeof versaoGravada === "string" && versaoGravada !== entrada.versaoDaRegra) {
      return falhaDeEscrita("state_conflict", MENSAGEM_DA_VERSAO_VELHA, 409);
    }
  }

  const recemCriado = pointerId === null;
  if (pointerId === null) {
    const criado = await deps.criarFluxo(db, {
      organizationId,
      nome: PONTEIRO_DA_AUTOMACAO(entrada.ruleId ?? randomUUID()),
      surface: "crm_automation",
      autor,
      requestId,
    });
    if (!criado.ok) return criado;
    pointerId = criado.dado.id;
  }

  const salvo = await deps.salvarFluxo(db, {
    organizationId,
    pointerId,
    alteracoes: { draft_graph: entrada.grafo },
    autor,
    requestId,
  });
  if (!salvo.ok) return salvo;
  const publicado = await deps.publicarFluxo(admin, {
    organizationId,
    pointerId,
    autor,
    aprovadoPor: entrada.aprovadoPor,
    requestId,
  });
  if (!publicado.ok) {
    if (recemCriado) await deps.descartarFluxo(db, organizationId, pointerId);
    return publicado;
  }

  const acoes = [{ type: ACAO_DO_FLUXO as "start_message_flow", config: { flow_pointer_id: pointerId } }];
  if (regraGravada && entrada.ruleId) {
    const atualizada = await deps.atualizarRegra(db, {
      organizationId,
      regraId: entrada.ruleId,
      requestId,
      actor,
      patch: { ...conferida.data, actions: acoes, ...(entrada.versaoDaRegra ? { versao_lida: entrada.versaoDaRegra } : {}) },
    });
    return atualizada.ok
      ? { ok: true, dado: { ruleId: entrada.ruleId, pointerId, atualizadoEm: quando(atualizada.dado) } }
      : atualizada;
  }
  const criada = await deps.criarRegra(db, {
    organizationId,
    criadoPorUserId: actor.id,
    requestId,
    dados: { ...conferida.data, actions: acoes },
  });
  return criada.ok ? { ok: true, dado: { ruleId: criada.dado.id, pointerId, atualizadoEm: quando(criada.dado) } } : criada;
}
