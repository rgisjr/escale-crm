import { randomUUID } from "node:crypto";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { lerListaDeAutomacoes } from "@/lib/escale/automacoes/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/automacoes-da-casca — a lista de automações, as pastas e os agentes
 * (fork Escale, Fase 5A). Gerente para cima, com a sessão (a RLS da 9701 vale).
 */
export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!authz.ok) return authz.response;
  try {
    const lista = await lerListaDeAutomacoes(await createClient(), authz.org.orgId, authz.user.id);
    return ok(lista, { requestId });
  } catch (err) {
    console.error("[automacoes-da-casca] lista", requestId, err);
    return fail("internal_error", traduzir("Erro inesperado.", authz.user.idioma), 500, { requestId });
  }
}
