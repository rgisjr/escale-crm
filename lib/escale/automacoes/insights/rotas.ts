import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

import { regraDaOrganizacao, type RegraDosInsights } from "./banco";

type Autorizado = Extract<Awaited<ReturnType<typeof requireRole>>, { ok: true }>;

export interface ContextoDosInsights {
  supabase: SupabaseClient;
  authz: Autorizado;
  regra: RegraDosInsights;
  requestId: string;
  t: (texto: string) => string;
}

/**
 * O PRÓLOGO das rotas dos insights (fork Escale, Fase 5C): gerente, id que é uuid, regra da
 * organização da sessão (404 sem tocar na RPC) e o 500 com o `requestId` no log.
 */
export async function comRegraDosInsights(
  ctx: { params: Promise<{ id: string }> },
  rotulo: string,
  tratar: (c: ContextoDosInsights) => Promise<Response>,
): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  const naoAchou = () => fail("not_found", t("Regra não encontrada."), 404, { requestId });
  if (!z.string().uuid().safeParse(id).success) return naoAchou();
  try {
    const supabase = await createClient();
    const regra = await regraDaOrganizacao(supabase, authz.org.orgId, id);
    if (!regra) return naoAchou();
    return await tratar({ supabase, authz, regra, requestId, t });
  } catch (err) {
    console.error(`[automacoes-da-casca] ${rotulo}`, requestId, err);
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}

export const recusaDeValidacao = (c: Pick<ContextoDosInsights, "requestId" | "t">): Response =>
  fail("validation_failed", c.t("Falha na validação dos dados!"), 422, { requestId: c.requestId });
