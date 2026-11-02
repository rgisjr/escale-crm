/**
 * POST / DELETE /api/v1/escale/comentarios/[comentarioId]/ocultar — oculta (POST) ou reexibe (DELETE) o
 * comentário no Instagram/Facebook (fork Escale, Fase 10A). POST: { canal, publicacao, autor? };
 * DELETE: ?canal=&publicacao=&autor=.
 */
import type { NextRequest } from "next/server";

import { ocultarAMao } from "@/lib/escale/comentarios/acoes-manuais";
import { erroInesperado, prepararAcaoNoComentario, respostaDoResultado } from "@/lib/escale/comentarios/rota-da-acao";
import { requireSupportWrite } from "@/lib/impersonate/support";

export const dynamic = "force-dynamic";

const AUTOR_MAXIMO = 128;

const autorDaAcao = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 && v.length <= AUTOR_MAXIMO ? v : null;

export async function POST(req: NextRequest, { params }: { params: Promise<{ comentarioId: string }> }): Promise<Response> {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  const preparo = await prepararAcaoNoComentario(req, params, { papelMinimo: "agent" });
  if (!preparo.ok) return preparo.response;
  const { ctx } = preparo;
  try {
    return respostaDoResultado(await ocultarAMao(ctx, true, autorDaAcao(ctx.corpo.autor)), ctx.requestId);
  } catch (erro) {
    return erroInesperado("ocultar", ctx.requestId, erro);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ comentarioId: string }> }): Promise<Response> {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  const preparo = await prepararAcaoNoComentario(req, params, { papelMinimo: "agent" });
  if (!preparo.ok) return preparo.response;
  const { ctx } = preparo;
  try {
    return respostaDoResultado(await ocultarAMao(ctx, false, autorDaAcao(ctx.corpo.autor)), ctx.requestId);
  } catch (erro) {
    return erroInesperado("reexibir", ctx.requestId, erro);
  }
}
