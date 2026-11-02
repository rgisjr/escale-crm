/**
 * POST /api/v1/escale/comentarios/[comentarioId]/direct { canal, publicacao, texto, autor, comentadoEm }
 * — manda o direct (resposta privada) a partir do comentário (fork Escale, Fase 10A). Um por comentário,
 * até 7 dias; a mensagem entra na conversa do contato.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { mandarDirectAMao } from "@/lib/escale/comentarios/acoes-manuais";
import { MAXIMO_DO_TEXTO_A_MAO } from "@/lib/escale/comentarios/constantes";
import { erroInesperado, prepararAcaoNoComentario, respostaDoResultado } from "@/lib/escale/comentarios/rota-da-acao";
import { requireSupportWrite } from "@/lib/impersonate/support";

export const dynamic = "force-dynamic";

const corpoSchema = z.object({
  texto: z.string().trim().min(1).max(MAXIMO_DO_TEXTO_A_MAO),
  comentadoEm: z.string().min(1).max(64),
  autor: z.object({
    id: z.string().min(1).max(128),
    usuario: z.string().max(128).nullable(),
    nome: z.string().max(200).nullable(),
  }),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ comentarioId: string }> }): Promise<Response> {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  const preparo = await prepararAcaoNoComentario(req, params, { papelMinimo: "agent" });
  if (!preparo.ok) return preparo.response;
  const { ctx } = preparo;

  const corpo = corpoSchema.safeParse(ctx.corpo);
  if (!corpo.success) return fail("validation_failed", "Falha na validação dos dados!", 422, { requestId: ctx.requestId });

  try {
    return respostaDoResultado(await mandarDirectAMao(ctx, corpo.data), ctx.requestId);
  } catch (erro) {
    return erroInesperado("direct", ctx.requestId, erro);
  }
}
