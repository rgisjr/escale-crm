import { randomUUID } from "node:crypto";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { roleAtLeast } from "@/lib/auth/types";
import { criarPainelEmBranco, lerPaineis } from "@/lib/escale/indicadores/paineis/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/indicadores-da-casca/paineis — a lista de painéis (fork Escale,
 * Fase 7B). Atendente para cima; a RLS da 9601 decide quais. As listas de
 * permissão só vão para gerente ou acima (a aba Permissões é deles).
 */
export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  try {
    const paineis = await lerPaineis(
      await createClient(),
      authz.org.orgId,
      roleAtLeast(authz.org.role, "manager"),
    );
    return ok({ paineis }, { requestId });
  } catch (err) {
    console.error("[indicadores-da-casca] lista de painéis", requestId, err);
    return fail("internal_error", traduzir("Erro inesperado.", authz.user.idioma), 500, { requestId });
  }
}

/** POST /api/v1/indicadores-da-casca/paineis — cria um painel em branco. Gerente para cima. */
export async function POST(): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  try {
    const { id } = await criarPainelEmBranco(
      await createClient(),
      authz.org.orgId,
      authz.user.id,
      traduzir("Novo dashboard", authz.user.idioma),
    );
    void audit({
      action: "dashboard.created",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "dashboard",
      resourceId: id,
      requestId,
    });
    return ok({ id }, { requestId, status: 201 });
  } catch (err) {
    console.error("[indicadores-da-casca] criar painel", requestId, err);
    return fail("internal_error", traduzir("Erro inesperado.", authz.user.idioma), 500, { requestId });
  }
}
