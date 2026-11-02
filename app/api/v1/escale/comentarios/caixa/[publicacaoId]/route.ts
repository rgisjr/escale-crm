/**
 * GET /api/v1/escale/comentarios/caixa/[publicacaoId]?canal=&cursor= — os comentários de uma publicação
 * (com as respostas aninhadas), lidos sob demanda do Zernio (fork Escale, Fase 10A).
 */
import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { comentariosDaCaixa } from "@/lib/escale/comentarios/leitura-da-caixa";
import { erroInesperado, prepararLeituraDaCaixa, respostaDoErroDoZernio } from "@/lib/escale/comentarios/rota-da-acao";

export const dynamic = "force-dynamic";

const ID_MAXIMO = 128;

export async function GET(req: NextRequest, { params }: { params: Promise<{ publicacaoId: string }> }): Promise<Response> {
  const busca = req.nextUrl.searchParams;
  const preparo = await prepararLeituraDaCaixa(busca.get("canal"));
  if (!preparo.ok) return preparo.response;
  const { ctx } = preparo;

  const { publicacaoId } = await params;
  const cursor = busca.get("cursor") || null;
  if (publicacaoId.length < 1 || publicacaoId.length > ID_MAXIMO || (cursor !== null && cursor.length > 500)) {
    return fail("validation_failed", "Falha na validação dos dados!", 422, { requestId: ctx.requestId });
  }

  try {
    const r = await comentariosDaCaixa(ctx.admin, {
      organizationId: ctx.organizationId,
      conta: ctx.conta,
      chave: ctx.chave,
      publicacaoId,
      cursor,
      agora: new Date(),
    });
    if (!r.ok) return respostaDoErroDoZernio(r.status, r.corpo, ctx.requestId);
    return ok({ comentarios: r.dados.itens, proximo: r.dados.proximo }, { requestId: ctx.requestId });
  } catch (erro) {
    return erroInesperado("caixa/publicacao", ctx.requestId, erro);
  }
}
