/**
 * O que as rotas de origens compartilham (fork Escale, Fase 1A): ler o corpo,
 * reler as origens e traduzir o conflito de nome do banco.
 *
 * `requireSupportWrite()` e `requireRole()` NÃO moram aqui de propósito: o gate
 * `tests/unit/suporte-cobertura-de-efeitos.test.ts` lê cada handler e exige a
 * guarda de suporte escrita nele.
 */
import { fail, ok } from "@/lib/api/wrappers";
import type { createClient } from "@/lib/supabase/server";

import { lerOrigens } from "./ler-origens";
import type { Origens } from "./regras";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function lerJson(req: Request): Promise<{ ok: true; json: unknown } | { ok: false }> {
  try {
    return { ok: true, json: await req.json() };
  } catch {
    return { ok: false };
  }
}

export async function origensOuFalha(
  supabase: Supabase,
  orgId: string,
  requestId: string,
): Promise<{ ok: true; origens: Origens } | { ok: false; resposta: Response }> {
  try {
    return { ok: true, origens: await lerOrigens(supabase, orgId) };
  } catch (err) {
    return { ok: false, resposta: fail("internal_error", (err as Error).message, 500, { requestId }) };
  }
}

/**
 * Responde com as origens RELIDAS do banco: a tela aplica o corpo em vez de
 * esperar o `router.refresh()` (ver `hooks/escale/useOrigens.ts`).
 */
export async function responderComOrigens(
  supabase: Supabase,
  orgId: string,
  requestId: string,
  status: 200 | 201 = 200,
): Promise<Response> {
  const lido = await origensOuFalha(supabase, orgId, requestId);
  return lido.ok ? ok(lido.origens, { status, requestId }) : lido.resposta;
}

/** `uq_crm_pipeline_groups_org_nome` venceu a corrida (outra aba criou o mesmo nome). */
export function nomeRepetido(
  erro: { code?: string } | null | undefined,
  t: (texto: string) => string,
  requestId: string,
): Response | null {
  if (erro?.code !== "23505") return null;
  return fail("state_conflict", t("Já existe um grupo com esse nome."), 409, { requestId });
}
