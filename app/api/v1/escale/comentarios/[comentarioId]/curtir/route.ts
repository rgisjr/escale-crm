/**
 * POST / DELETE /api/v1/escale/comentarios/[comentarioId]/curtir — curte (POST) ou tira a curtida
 * (DELETE) do comentário, só em conta do Facebook (fork Escale, Fase 10D, D15). O Instagram está em
 * liberação restrita no Zernio. POST: { canal, publicacao, autor? }; DELETE: ?canal=&publicacao=&autor=.
 */
import type { NextRequest } from "next/server";

import { fail } from "@/lib/api/wrappers";
import { curtirAMao } from "@/lib/escale/comentarios/acoes-manuais";
import { SO_NO_FACEBOOK } from "@/lib/escale/comentarios/constantes";
import { erroInesperado, prepararAcaoNoComentario, respostaDoResultado } from "@/lib/escale/comentarios/rota-da-acao";
import { requireSupportWrite } from "@/lib/impersonate/support";

export const dynamic = "force-dynamic";

const AUTOR_MAXIMO = 128;

const autorDaAcao = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 && v.length <= AUTOR_MAXIMO ? v : null;

async function tratar(req: NextRequest, params: Promise<{ comentarioId: string }>, curtir: boolean): Promise<Response> {
  const preparo = await prepararAcaoNoComentario(req, params, { papelMinimo: "agent" });
  if (!preparo.ok) return preparo.response;
  const { ctx } = preparo;
  if (ctx.conta.plataforma !== "facebook") {
    return fail("so_no_facebook", SO_NO_FACEBOOK, 422, { requestId: ctx.requestId });
  }
  try {
    return respostaDoResultado(await curtirAMao(ctx, curtir, autorDaAcao(ctx.corpo.autor)), ctx.requestId);
  } catch (erro) {
    return erroInesperado(curtir ? "curtir" : "descurtir", ctx.requestId, erro);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ comentarioId: string }> }): Promise<Response> {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  return tratar(req, params, true);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ comentarioId: string }> }): Promise<Response> {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  return tratar(req, params, false);
}
