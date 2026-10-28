import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { excluirGrafico } from "@/lib/escale/indicadores/graficos/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** DELETE /api/v1/indicadores-da-casca/graficos/:id — exclui o gráfico, definitivo como na Clint (R5). Gerente para cima. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("not_found", t("Chart não encontrado."), 404, { requestId });
  }
  try {
    const supabase = await createClient();
    if (!(await excluirGrafico(supabase, authz.org.orgId, id))) {
      return fail("not_found", t("Chart não encontrado."), 404, { requestId });
    }
    void audit({
      action: "dashboard.chart_deleted",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "dashboard_chart",
      resourceId: id,
      requestId,
    });
    return ok({ id }, { requestId });
  } catch (err) {
    logger.error("indicadores.grafico_exclusao_falhou", { requestId, motivo: (err as Error).message });
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}
