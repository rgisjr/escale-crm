import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { FalhaDoPainel, duplicarPainel, lerPainel } from "@/lib/escale/indicadores/paineis/banco";
import { nomeDaCopia } from "@/lib/escale/indicadores/paineis/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/indicadores-da-casca/paineis/:id/duplicar — copia o painel e os
 * gráficos (fork Escale, Fase 7B; `fn_escale_duplicar_painel`, invoker). Gerente para cima.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("not_found", t("Dashboard não encontrado."), 404, { requestId });
  }
  try {
    const supabase = await createClient();
    const painel = await lerPainel(supabase, authz.org.orgId, id, false);
    if (!painel) return fail("not_found", t("Dashboard não encontrado."), 404, { requestId });
    const novo = await duplicarPainel(supabase, id, nomeDaCopia(painel.nome));
    void audit({
      action: "dashboard.cloned",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "dashboard",
      resourceId: novo.id,
      requestId,
      metadata: { origem: id },
    });
    return ok({ id: novo.id }, { requestId, status: 201 });
  } catch (err) {
    if (err instanceof FalhaDoPainel && err.codigo === "nao_encontrado") {
      return fail("not_found", t("Dashboard não encontrado."), 404, { requestId });
    }
    console.error("[indicadores-da-casca] duplicar painel", requestId, err);
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}
