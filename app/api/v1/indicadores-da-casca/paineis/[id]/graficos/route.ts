import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { lerGraficos } from "@/lib/escale/indicadores/graficos/banco";
import { lerPainel } from "@/lib/escale/indicadores/paineis/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/v1/indicadores-da-casca/paineis/:id/graficos — os gráficos de um painel (fork Escale, Fase 7C). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "indicadores" });
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
    return ok({ graficos: await lerGraficos(supabase, authz.org.orgId, id) }, { requestId });
  } catch (err) {
    logger.error("indicadores.graficos_leitura_falhou", { requestId, motivo: (err as Error).message });
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}
