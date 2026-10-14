/**
 * O que as rotas de visualizações compartilham (fork Escale, Fase 1C): reler a
 * lista e dar nome aos erros do banco.
 *
 * `requireSupportWrite()` e `requireRole()` NÃO moram aqui de propósito: o gate
 * `tests/unit/suporte-cobertura-de-efeitos.test.ts` lê cada handler e exige a
 * guarda de suporte escrita nele.
 */
import { fail, ok } from "@/lib/api/wrappers";
import type { createClient } from "@/lib/supabase/server";

import { lerVisualizacoes } from "./ler-visualizacoes";
import type { Visualizacao } from "./regras";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function visualizacoesOuFalha(
  supabase: Supabase,
  orgId: string,
  requestId: string,
): Promise<{ ok: true; visualizacoes: Visualizacao[] } | { ok: false; resposta: Response }> {
  try {
    return { ok: true, visualizacoes: await lerVisualizacoes(supabase, orgId) };
  } catch (err) {
    return { ok: false, resposta: fail("internal_error", (err as Error).message, 500, { requestId }) };
  }
}

/** Responde com a lista RELIDA do banco: a tela aplica o corpo, sem esperar o refresh. */
export async function responderComVisualizacoes(
  supabase: Supabase,
  orgId: string,
  requestId: string,
  status: 200 | 201 = 200,
): Promise<Response> {
  const lido = await visualizacoesOuFalha(supabase, orgId, requestId);
  return lido.ok ? ok(lido.visualizacoes, { status, requestId }) : lido.resposta;
}

/**
 * A função grava como quem chama (security invoker): o que o banco recusa tem
 * nome para gente. 23505 = o índice do nome venceu a corrida; 23503 = a FK
 * composta recusou origem ou pessoa de fora; 22023 = a faixa de 1 a 20; 42501 =
 * a RLS (o papel mudou entre o `requireRole` e a escrita).
 */
export function falhaDaGravacao(
  erro: { code?: string; message?: string; details?: string | null },
  t: (texto: string) => string,
  requestId: string,
): Response {
  // O `id` vem do cliente: o POST com um id que já é de outra organização bate na chave primária.
  if (erro.code === "23505" && `${erro.message ?? ""} ${erro.details ?? ""}`.includes("crm_pipeline_views_pkey")) {
    return fail("state_conflict", t("Essa visualização já existe."), 409, { requestId });
  }
  if (erro.code === "23505") return fail("state_conflict", t("Já existe uma visualização com esse nome."), 409, { requestId });
  if (erro.code === "23503") {
    return fail("unprocessable_entity", t("Escolha origens e pessoas desta organização."), 422, { requestId });
  }
  if (erro.code === "22023") return fail("unprocessable_entity", t("Uma visualização junta de 1 a 20 origens."), 422, { requestId });
  if (erro.code === "42501") return fail("forbidden", t("Só gerente ou administrador muda visualizações."), 403, { requestId });
  return fail("internal_error", erro.message ?? "", 500, { requestId });
}
