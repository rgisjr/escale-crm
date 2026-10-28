import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { salvarLayouts } from "@/lib/escale/indicadores/graficos/banco";
import { COLUNAS_DA_GRADE, GRAFICOS_POR_PAINEL_MAX } from "@/lib/escale/indicadores/graficos/tipos";
import { lerPainel } from "@/lib/escale/indicadores/paineis/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const itemSchema = z
  .object({
    id: z.string().uuid(),
    x: z.number().int().min(0).max(COLUNAS_DA_GRADE - 1),
    y: z.number().int().min(0).max(10_000),
    w: z.number().int().min(2).max(COLUNAS_DA_GRADE),
    h: z.number().int().min(2).max(60),
  })
  .strict()
  .refine((i) => i.x + i.w <= COLUNAS_DA_GRADE);
const corpoSchema = z.object({ itens: z.array(itemSchema).min(1).max(GRAFICOS_POR_PAINEL_MAX) }).strict();

/**
 * PATCH /api/v1/indicadores-da-casca/paineis/:id/layout — grava a posição dos gráficos que mudaram
 * (fork Escale, Fase 7C, R6). Gerente para cima. Sem `audit`: é arrumação de tela, a cada arraste.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
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
  const lido = corpoSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) {
    return fail("validation_failed", t("Falha na validação dos dados!"), 422, { requestId });
  }
  try {
    const supabase = await createClient();
    const painel = await lerPainel(supabase, authz.org.orgId, id, false);
    if (!painel) return fail("not_found", t("Dashboard não encontrado."), 404, { requestId });
    await salvarLayouts(supabase, authz.org.orgId, id, lido.data.itens);
    return ok({ salvos: lido.data.itens.length }, { requestId });
  } catch (err) {
    logger.error("indicadores.layout_falhou", { requestId, motivo: (err as Error).message });
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}
