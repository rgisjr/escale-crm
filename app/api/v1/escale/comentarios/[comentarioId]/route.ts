/**
 * DELETE /api/v1/escale/comentarios/[comentarioId]?canal=&publicacao=&autor= — apaga o comentário no
 * Instagram/Facebook, para todos (fork Escale, Fase 10A). Só gerente e administrador.
 */
import type { NextRequest } from "next/server";

import { apagarAMao } from "@/lib/escale/comentarios/acoes-manuais";
import { erroInesperado, prepararAcaoNoComentario, respostaDoResultado } from "@/lib/escale/comentarios/rota-da-acao";
import { requireSupportWrite } from "@/lib/impersonate/support";

export const dynamic = "force-dynamic";

const AUTOR_MAXIMO = 128;

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ comentarioId: string }> }): Promise<Response> {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  const preparo = await prepararAcaoNoComentario(req, params, { papelMinimo: "manager" });
  if (!preparo.ok) return preparo.response;
  const { ctx } = preparo;
  const autor = ctx.corpo.autor;
  try {
    const autorId = typeof autor === "string" && autor.length > 0 && autor.length <= AUTOR_MAXIMO ? autor : null;
    return respostaDoResultado(await apagarAMao(ctx, autorId), ctx.requestId);
  } catch (erro) {
    return erroInesperado("apagar", ctx.requestId, erro);
  }
}
