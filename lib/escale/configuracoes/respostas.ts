/**
 * O que a rota das configurações da origem compartilha (fork Escale, Fase 1F):
 * ler a origem com as etapas vivas e o catálogo da organização, responder com o
 * que a tela recebe e dar nome ao erro do banco.
 *
 * `requireSupportWrite()` e `requireRole()` NÃO moram aqui de propósito: o gate
 * `tests/unit/suporte-cobertura-de-efeitos.test.ts` lê cada handler e exige a
 * guarda de suporte escrita nele.
 */
import { fail, ok } from "@/lib/api/wrappers";
import type { VisibilityMode } from "@/lib/auth/types";
import { logger } from "@/lib/logger";
import type { MoedaServida } from "@/lib/money";
import type { createClient } from "@/lib/supabase/server";

import { montarConfiguracoes, type EtapaDaOrigem } from "./montar";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Traduzir = (texto: string) => string;
type ErroDoBanco = { code?: string; message?: string };

/** Onde o erro aconteceu: vai para o log, nunca para o cliente. */
export interface OndeFalhou {
  rota: string;
  operacao: string;
}

/**
 * 500 para o que o banco devolveu e a gente não sabe nomear: o cliente recebe só
 * o texto genérico; a mensagem crua fica no log do servidor, com o requestId.
 */
export function falhaInesperada(
  erro: ErroDoBanco | null | undefined,
  onde: OndeFalhou,
  t: Traduzir,
  requestId: string,
): Response {
  logger.error("[configuracoes-da-origem] erro inesperado", {
    rota: onde.rota,
    operacao: onde.operacao,
    codigo: erro?.code ?? null,
    erro: erro?.message ?? String(erro),
    requestId,
  });
  return fail("internal_error", t("Não consegui completar essa ação. Tente de novo."), 500, {
    requestId,
  });
}

/**
 * 409 de "tente de novo": outra gravação passou na frente (deadlock, falha de
 * serialização ou o `updated_at` da origem mudou entre a leitura e a escrita).
 */
export function conflitoDeGravacao(t: Traduzir, requestId: string): Response {
  return fail("state_conflict", t("Outra pessoa está salvando ao mesmo tempo. Tente de novo."), 409, {
    requestId,
  });
}

/**
 * O erro do `update` do `settings`, nomeado. 42501 (RLS): quem pede não é
 * gerente. 40P01 (deadlock) e 40001 (serialização): duas pessoas salvando ao
 * mesmo tempo (os gatilhos do catálogo de campos travam a organização). 23514:
 * um gatilho ou uma trava do banco recusou o conteúdo. O resto é 500.
 */
export function respostaDoErroDeGravacao(
  erro: ErroDoBanco,
  onde: OndeFalhou,
  t: Traduzir,
  requestId: string,
): Response {
  if (erro.code === "42501") {
    return fail(
      "forbidden",
      t("Só gerente ou administrador muda as configurações da origem."),
      403,
      { requestId },
    );
  }
  if (erro.code === "40P01" || erro.code === "40001") return conflitoDeGravacao(t, requestId);
  if (erro.code === "23514") {
    return fail(
      "unprocessable_entity",
      t("Alguma configuração não é válida. Revise e tente de novo."),
      422,
      { requestId },
    );
  }
  return falhaInesperada(erro, onde, t, requestId);
}

export interface OrigemLida {
  pipeline: {
    id: string;
    name: string;
    group_id: string | null;
    is_default: boolean;
    settings: unknown;
    /** A versão lida: a gravação só vale se a origem ainda estiver com este carimbo. */
    updated_at: string;
  };
  /** Só as etapas vivas (não arquivadas), na ordem do quadro. */
  etapas: EtapaDaOrigem[];
  /** O `settings` de todas as origens da organização (o catálogo de motivos). */
  catalogo: unknown[];
  /** O grupo da origem (1J): a RLS decide se a sessão o vê; sem ele, lista vazia. */
  grupo: { settings: unknown } | null;
}

export type LeituraDaOrigem =
  | ({ ok: true } & OrigemLida)
  | { ok: false; erro: "nao_encontrada" }
  | { ok: false; erro: "banco"; causa: ErroDoBanco };

/** A origem da organização da sessão, com as etapas vivas. Lê com o cliente de quem pede (RLS). */
export async function lerOrigemDaConfiguracao(
  supabase: Supabase,
  orgId: string,
  pipelineId: string,
): Promise<LeituraDaOrigem> {
  const [funil, etapas, todas] = await Promise.all([
    supabase
      .from("crm_pipelines")
      .select("id, name, group_id, is_default, settings, updated_at")
      .eq("id", pipelineId)
      .eq("organization_id", orgId)
      .maybeSingle(),
    supabase
      .from("crm_stages")
      .select("id, name, position, is_won, is_lost")
      .eq("pipeline_id", pipelineId)
      .eq("organization_id", orgId)
      .eq("is_archived", false)
      .order("position", { ascending: true }),
    supabase.from("crm_pipelines").select("settings").eq("organization_id", orgId),
  ]);
  if (funil.error) return { ok: false, erro: "banco", causa: funil.error };
  if (!funil.data) return { ok: false, erro: "nao_encontrada" };
  if (etapas.error) return { ok: false, erro: "banco", causa: etapas.error };
  if (todas.error) return { ok: false, erro: "banco", causa: todas.error };
  const p = funil.data as {
    id: string;
    name: string;
    group_id?: string | null;
    is_default?: boolean;
    settings?: unknown;
    updated_at?: unknown;
  };
  if (typeof p.updated_at !== "string") {
    return { ok: false, erro: "banco", causa: { message: "crm_pipelines.updated_at ausente" } };
  }
  const linhas = (etapas.data ?? []) as Array<{
    id: string;
    name: string;
    position: number | string;
    is_won?: boolean;
    is_lost?: boolean;
  }>;
  let grupo: { settings: unknown } | null = null;
  if (typeof p.group_id === "string") {
    const g = await supabase
      .from("crm_pipeline_groups")
      .select("settings")
      .eq("id", p.group_id)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (g.error) return { ok: false, erro: "banco", causa: g.error };
    grupo = g.data ? { settings: (g.data as { settings?: unknown }).settings ?? null } : null;
  }
  return {
    ok: true,
    pipeline: {
      id: p.id,
      name: p.name,
      group_id: p.group_id ?? null,
      is_default: p.is_default === true,
      settings: p.settings ?? null,
      updated_at: p.updated_at,
    },
    etapas: linhas.map((e) => ({
      id: e.id,
      name: e.name,
      position: Number(e.position),
      is_won: e.is_won === true,
      is_lost: e.is_lost === true,
    })),
    catalogo: (todas.data ?? []).map((o) => (o as { settings?: unknown }).settings ?? null),
    grupo,
  };
}

export interface ContextoDaResposta {
  orgId: string;
  pipelineId: string;
  moedaDaOrganizacao: MoedaServida;
  visualizacaoDaOrganizacao: VisibilityMode;
  podeAdministrar: boolean;
}

/** Relê a origem e devolve `{ data: ConfiguracoesDaOrigem }`. */
export async function responderComConfiguracoes(
  supabase: Supabase,
  ctx: ContextoDaResposta,
  t: Traduzir,
  requestId: string,
  onde: OndeFalhou,
): Promise<Response> {
  const lido = await lerOrigemDaConfiguracao(supabase, ctx.orgId, ctx.pipelineId);
  if (!lido.ok) {
    return lido.erro === "nao_encontrada"
      ? fail("not_found", t("Origem não encontrada."), 404, { requestId })
      : falhaInesperada(lido.causa, onde, t, requestId);
  }
  return ok(
    montarConfiguracoes({
      pipeline: lido.pipeline,
      etapas: lido.etapas,
      catalogo: lido.catalogo,
      moedaDaOrganizacao: ctx.moedaDaOrganizacao,
      visualizacaoDaOrganizacao: ctx.visualizacaoDaOrganizacao,
      grupo: lido.grupo,
      podeAdministrar: ctx.podeAdministrar,
    }),
    { requestId },
  );
}
