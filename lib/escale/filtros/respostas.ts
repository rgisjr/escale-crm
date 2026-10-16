/**
 * O que as rotas de filtros salvos compartilham (fork Escale, Fase 1D): o alvo
 * da busca, reler a lista e dar nome aos erros do banco.
 *
 * `requireSupportWrite()` e `requireRole()` NÃO moram aqui de propósito: o gate
 * `tests/unit/suporte-cobertura-de-efeitos.test.ts` lê cada handler e exige a
 * guarda de suporte escrita nele.
 */
import { fail, ok } from "@/lib/api/wrappers";
import { logger } from "@/lib/logger";
import type { createClient } from "@/lib/supabase/server";

import type { AlvoDoFiltro, FiltroSalvo } from "./filtros-salvos";
import { lerFiltrosSalvos, lerMeusFiltrosCrus } from "./ler-filtros-salvos";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type Traduzir = (texto: string) => string;

/** Onde o erro aconteceu: vai para o log, nunca para o cliente. */
export interface OndeFalhou {
  rota: string;
  operacao: string;
}

/**
 * 500 para o que o banco devolveu e a gente não sabe nomear: o cliente recebe só
 * o texto genérico; a mensagem crua (que cita tabela, constraint e coluna) fica
 * no log do servidor, com o requestId para achar a linha.
 */
export function falhaInesperada(
  erro: { code?: string; message?: string } | null | undefined,
  onde: OndeFalhou,
  t: Traduzir,
  requestId: string,
): Response {
  logger.error("[filtros-salvos] erro inesperado", {
    rota: onde.rota,
    operacao: onde.operacao,
    codigo: erro?.code ?? null,
    erro: erro?.message ?? String(erro),
    requestId,
  });
  return fail("internal_error", t("Não consegui completar essa ação. Tente de novo."), 500, { requestId });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `?origem=<uuid>` OU `?visualizacao=<uuid>` — um e só um. */
export function alvoDaBusca(params: URLSearchParams): AlvoDoFiltro | null {
  const origem = params.get("origem");
  const visualizacao = params.get("visualizacao");
  if (origem && !visualizacao && UUID.test(origem)) return { tipo: "origem", id: origem };
  if (visualizacao && !origem && UUID.test(visualizacao)) return { tipo: "visualizacao", id: visualizacao };
  return null;
}

export async function filtrosSalvosOuFalha(
  supabase: Supabase,
  orgId: string,
  userId: string,
  alvo: AlvoDoFiltro,
  requestId: string,
  t: Traduzir,
  onde: OndeFalhou,
): Promise<{ ok: true; filtros: FiltroSalvo[] } | { ok: false; resposta: Response }> {
  try {
    return { ok: true, filtros: await lerFiltrosSalvos(supabase, orgId, userId, alvo) };
  } catch (err) {
    return { ok: false, resposta: falhaInesperada(err as Error, onde, t, requestId) };
  }
}

/** Os meus filtros CRUS do alvo (limite e nome repetido); o erro do banco vira 500. */
export async function meusFiltrosCrusOuFalha(
  supabase: Supabase,
  orgId: string,
  userId: string,
  alvo: AlvoDoFiltro,
  requestId: string,
  t: Traduzir,
  onde: OndeFalhou,
): Promise<{ ok: true; filtros: Array<{ id: string; nome: string }> } | { ok: false; resposta: Response }> {
  try {
    return { ok: true, filtros: await lerMeusFiltrosCrus(supabase, orgId, userId, alvo) };
  } catch (err) {
    return { ok: false, resposta: falhaInesperada(err as Error, onde, t, requestId) };
  }
}

/** Responde com a lista do alvo RELIDA do banco: a tela aplica o corpo. */
export async function responderComFiltrosSalvos(
  supabase: Supabase,
  orgId: string,
  userId: string,
  alvo: AlvoDoFiltro,
  requestId: string,
  t: Traduzir,
  onde: OndeFalhou,
  status: 200 | 201 = 200,
): Promise<Response> {
  const lido = await filtrosSalvosOuFalha(supabase, orgId, userId, alvo, requestId, t, onde);
  return lido.ok ? ok(lido.filtros, { status, requestId }) : lido.resposta;
}

/**
 * O que o banco recusa tem nome para gente. 23505 = o índice do nome (ou o id
 * repetido) venceu a corrida; 23503 = a FK composta recusou um alvo de fora;
 * 23514 = um CHECK (alvo, nome, critérios) — ou o trigger do limite de 20
 * (constraint crm_filtros_salvos_limite, na mensagem); 42501 = a RLS (não é o
 * dono, ou o alvo não é visível para quem grava; o PATCH, que já conferiu a
 * posse, trata o 42501 como 404 na própria rota).
 */
export function falhaDaGravacaoDoFiltro(
  erro: { code?: string; message?: string },
  t: Traduzir,
  requestId: string,
  onde: OndeFalhou,
): Response {
  if (erro.code === "23505") {
    return erro.message?.includes("crm_filtros_salvos_pkey")
      ? fail("state_conflict", t("Esse filtro já existe."), 409, { requestId })
      : fail("state_conflict", t("Você já tem um filtro com esse nome aqui."), 409, { requestId });
  }
  if (erro.code === "23503") return fail("not_found", t("Origem ou visualização não encontrada."), 404, { requestId });
  if (erro.code === "23514" && erro.message?.includes("crm_filtros_salvos_limite")) {
    return fail("unprocessable_entity", t("Limite de 20 filtros salvos atingido. Exclua algum para salvar outro."), 422, { requestId });
  }
  if (erro.code === "23514") {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, { requestId });
  }
  if (erro.code === "42501") return fail("forbidden", t("Só quem criou o filtro pode mudá-lo."), 403, { requestId });
  return falhaInesperada(erro, onde, t, requestId);
}
