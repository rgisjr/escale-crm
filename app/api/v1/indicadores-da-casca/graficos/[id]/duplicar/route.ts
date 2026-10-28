import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { ErroDoGrafico, duplicarGrafico } from "@/lib/escale/indicadores/graficos/banco";
import { GRAFICOS_POR_PAINEL_MAX } from "@/lib/escale/indicadores/graficos/tipos";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TEXTO_DO_LIMITE =
  "Você só pode adicionar até {n} charts no seu dashboard. Para incluir novos, será necessário excluir um chart existente.";

/** POST /api/v1/indicadores-da-casca/graficos/:id/duplicar — copia o gráfico para o fim da grade (fork Escale, Fase 7C). Gerente para cima. */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
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
    const novo = await duplicarGrafico(supabase, authz.org.orgId, authz.user.id, id);
    void audit({
      action: "dashboard.chart_cloned",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "dashboard_chart",
      resourceId: novo.id,
      requestId,
      metadata: { origem: id },
    });
    return ok({ id: novo.id }, { requestId, status: 201 });
  } catch (err) {
    if (err instanceof ErroDoGrafico && err.motivo === "nao_encontrado") {
      return fail("not_found", t("Chart não encontrado."), 404, { requestId });
    }
    if (err instanceof ErroDoGrafico && err.motivo === "limite") {
      return fail("state_conflict", t(TEXTO_DO_LIMITE).replace("{n}", String(GRAFICOS_POR_PAINEL_MAX)), 409, { requestId });
    }
    logger.error("indicadores.grafico_duplicacao_falhou", { requestId, motivo: (err as Error).message });
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}
