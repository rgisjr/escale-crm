import type { NextRequest } from "next/server";

import { ok } from "@/lib/api/wrappers";
import { lerExecucoes } from "@/lib/escale/automacoes/insights/banco";
import { comRegraDosInsights, recusaDeValidacao } from "@/lib/escale/automacoes/insights/rotas";
import { GATILHO_DE_COMENTARIO } from "@/lib/escale/comentarios/constantes";
import { comPublicacoes } from "@/lib/escale/comentarios/publicacoes-das-execucoes";
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
    const lidas = await lerExecucoes(c.supabase, c.regra.id, pedido);
    // Fase 10C (D9): nas automações de comentário, cada execução leva a publicação do disparo.
    const linhas =
      c.regra.trigger_event === GATILHO_DE_COMENTARIO
        ? await comPublicacoes(c.supabase, c.regra.id, lidas.linhas)
        : lidas.linhas;
    return ok({ ...lidas, linhas }, { requestId: c.requestId });
  });
}
