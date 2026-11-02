/**
 * GET /api/v1/escale/comentarios/caixa?canal=&cursor=&periodo=&ordem= — as publicações da conta com
 * comentários, lidas sob demanda do Zernio (fork Escale, Fase 10A).
 */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { ORDENS_DA_CAIXA, PERIODOS_DA_CAIXA } from "@/lib/escale/comentarios/constantes";
import { publicacoesDaCaixa } from "@/lib/escale/comentarios/leitura-da-caixa";
import { erroInesperado, prepararLeituraDaCaixa, respostaDoErroDoZernio } from "@/lib/escale/comentarios/rota-da-acao";

export const dynamic = "force-dynamic";

const filtrosSchema = z.object({
  cursor: z.string().min(1).max(500).nullable(),
  periodo: z.enum(PERIODOS_DA_CAIXA).catch("30d"),
  ordem: z.enum(ORDENS_DA_CAIXA).catch("recentes"),
});

export async function GET(req: NextRequest): Promise<Response> {
  const busca = req.nextUrl.searchParams;
  const preparo = await prepararLeituraDaCaixa(busca.get("canal"));
  if (!preparo.ok) return preparo.response;
  const { ctx } = preparo;

  const filtros = filtrosSchema.safeParse({
    cursor: busca.get("cursor") || null,
    periodo: busca.get("periodo") ?? undefined,
    ordem: busca.get("ordem") ?? undefined,
  });
  if (!filtros.success) return fail("validation_failed", "Falha na validação dos dados!", 422, { requestId: ctx.requestId });

  try {
    const r = await publicacoesDaCaixa(ctx.admin, { conta: ctx.conta, chave: ctx.chave, ...filtros.data });
    if (!r.ok) return respostaDoErroDoZernio(r.status, r.corpo, ctx.requestId);
    return ok({ publicacoes: r.dados.itens, proximo: r.dados.proximo }, { requestId: ctx.requestId });
  } catch (erro) {
    return erroInesperado("caixa", ctx.requestId, erro);
  }
}
