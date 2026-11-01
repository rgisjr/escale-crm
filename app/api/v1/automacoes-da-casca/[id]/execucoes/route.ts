import type { NextRequest } from "next/server";

import { ok } from "@/lib/api/wrappers";
import { lerExecucoes } from "@/lib/escale/automacoes/insights/banco";
import { comRegraDosInsights, recusaDeValidacao } from "@/lib/escale/automacoes/insights/rotas";
import {
  POR_PAGINA_DAS_EXECUCOES,
  filtroDasExecucoesSchema,
  pedidoDeExecucoes,
} from "@/lib/escale/automacoes/insights/schema";

export const dynamic = "force-dynamic";

/** GET /api/v1/automacoes-da-casca/:id/execucoes — a listagem de execuções, 10 por página (fork Escale, Fase 5C). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  return comRegraDosInsights(ctx, "execucoes", async (c) => {
    const lido = filtroDasExecucoesSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!lido.success) return recusaDeValidacao(c);
    const pedido = pedidoDeExecucoes(
      lido.data,
      new Date(),
      POR_PAGINA_DAS_EXECUCOES,
      (lido.data.pagina - 1) * POR_PAGINA_DAS_EXECUCOES,
    );
    return ok(await lerExecucoes(c.supabase, c.regra.id, pedido), { requestId: c.requestId });
  });
}
