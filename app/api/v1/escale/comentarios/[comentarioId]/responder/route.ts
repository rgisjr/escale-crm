/**
 * POST /api/v1/escale/comentarios/[comentarioId]/responder { canal, publicacao, texto } — responde o
 * comentário em público (fork Escale, Fase 10A). A Idempotency-Key é o id da ação reservada.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { responderAMao } from "@/lib/escale/comentarios/acoes-manuais";
import { MAXIMO_DO_TEXTO_A_MAO } from "@/lib/escale/comentarios/constantes";
import { erroInesperado, prepararAcaoNoComentario, respostaDoResultado } from "@/lib/escale/comentarios/rota-da-acao";
import { requireSupportWrite } from "@/lib/impersonate/support";

export const dynamic = "force-dynamic";

const corpoSchema = z.object({ texto: z.string().trim().min(1).max(MAXIMO_DO_TEXTO_A_MAO) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ comentarioId: string }> }): Promise<Response> {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  const preparo = await prepararAcaoNoComentario(req, params, { papelMinimo: "agent" });
  if (!preparo.ok) return preparo.response;
  const { ctx } = preparo;

  const corpo = corpoSchema.safeParse(ctx.corpo);
  if (!corpo.success) return fail("validation_failed", "Falha na validação dos dados!", 422, { requestId: ctx.requestId });

  try {
    return respostaDoResultado(await responderAMao(ctx, corpo.data.texto), ctx.requestId);
  } catch (erro) {
    return erroInesperado("responder", ctx.requestId, erro);
  }
}
