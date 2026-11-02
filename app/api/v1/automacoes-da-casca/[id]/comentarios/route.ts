import type { NextRequest } from "next/server";

import { ok } from "@/lib/api/wrappers";
import { desdeDoPeriodo } from "@/lib/escale/automacoes/insights/regras";
import { comRegraDosInsights, recusaDeValidacao } from "@/lib/escale/automacoes/insights/rotas";
import { periodoSchema } from "@/lib/escale/automacoes/insights/schema";

export const dynamic = "force-dynamic";

const RESUMO_VAZIO = {
  comentarios: 0,
  repetidos: 0,
  directs: 0,
  directs_com_falha: 0,
  respostas: 0,
  respostas_com_falha: 0,
};

/** GET /api/v1/automacoes-da-casca/:id/comentarios?periodo=30d — os números do gatilho de comentário (fork Escale, Fase 10B). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  return comRegraDosInsights(ctx, "comentarios", async (c) => {
    const periodo = periodoSchema.safeParse(req.nextUrl.searchParams.get("periodo") ?? undefined);
    if (!periodo.success) return recusaDeValidacao(c);
    const { data, error } = await c.supabase.rpc("fn_escale_resumo_dos_comentarios", {
      p_regra: c.regra.id,
      p_desde: desdeDoPeriodo(periodo.data, new Date()),
    });
    if (error) throw new Error(error.message);
    return ok({ ...RESUMO_VAZIO, ...((data as Record<string, number> | null) ?? {}) }, { requestId: c.requestId });
  });
}
