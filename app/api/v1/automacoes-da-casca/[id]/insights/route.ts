import type { NextRequest } from "next/server";

import { ok } from "@/lib/api/wrappers";
import { lerResumo } from "@/lib/escale/automacoes/insights/banco";
import { desdeDoPeriodo } from "@/lib/escale/automacoes/insights/regras";
import { comRegraDosInsights, recusaDeValidacao } from "@/lib/escale/automacoes/insights/rotas";
import { periodoSchema } from "@/lib/escale/automacoes/insights/schema";

export const dynamic = "force-dynamic";

/** GET /api/v1/automacoes-da-casca/:id/insights?periodo=30d — os números da aba Insights (fork Escale, Fase 5C). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  return comRegraDosInsights(ctx, "insights", async (c) => {
    const periodo = periodoSchema.safeParse(req.nextUrl.searchParams.get("periodo") ?? undefined);
    if (!periodo.success) return recusaDeValidacao(c);
    const resumo = await lerResumo(c.supabase, c.regra.id, desdeDoPeriodo(periodo.data, new Date()));
    return ok(resumo, { requestId: c.requestId });
  });
}
