import { z } from "zod";

/**
 * FORK ESCALE · Fase 10B: o payload `comment.received` do Zernio (contrato do SDK 0.0.1300).
 * `isOwnAccount` ausente vale `false`: o SDK diz que no Instagram e no Facebook ele sempre vem.
 */
const textoOuNulo = z.string().nullish().transform((v) => v ?? null);

const webhookSchema = z.object({
  event: z.literal("comment.received"),
  id: textoOuNulo,
  account: z.object({ id: z.string().min(1), platform: z.string().min(1) }),
  comment: z.object({
    id: z.string().min(1),
    text: z.string().nullish().transform((v) => v ?? ""),
    createdAt: z.string().min(1),
    isReply: z.boolean().nullish().transform((v) => v ?? false),
    platformPostId: z.string().min(1),
    postId: textoOuNulo,
    isLive: z.boolean().nullish().transform((v) => v ?? false),
    author: z.object({
      id: z.string().min(1),
      username: textoOuNulo,
      name: textoOuNulo,
      isOwnAccount: z.boolean().nullish().transform((v) => v ?? false),
      /** FORK ESCALE · Fase 10D (D12): o Instagram só informa quando quer; ausente = não informado. */
      instagramProfile: z
        .object({ isFollower: z.boolean().nullish().transform((v) => v ?? null) })
        .nullish()
        .transform((v) => v?.isFollower ?? null),
    }),
  }),
  post: z
    .object({ content: textoOuNulo, imageUrl: textoOuNulo, permalink: textoOuNulo })
    .nullish()
    .transform((v) => v ?? { content: null, imageUrl: null, permalink: null }),
});

export interface ComentarioDoWebhook {
  /** O `id` do payload (o X-Zernio-Event-Id). */
  eventoId: string | null;
  contaId: string;
  plataforma: string;
  comentario: {
    id: string;
    texto: string;
    comentadoEm: string;
    ehResposta: boolean;
    publicacaoId: string;
    publicacaoZernioId: string | null;
    aoVivo: boolean;
  };
  autor: { id: string; usuario: string | null; nome: string | null; daPropriaConta: boolean; seguidor: boolean | null };
  publicacao: { legenda: string | null; miniatura: string | null; link: string | null };
}

/** null quando não é `comment.received` ou falta campo obrigatório. */
export function lerComentarioDoWebhook(payload: unknown): ComentarioDoWebhook | null {
  const lido = webhookSchema.safeParse(payload);
  if (!lido.success) return null;
  const { id, account, comment, post } = lido.data;
  return {
    eventoId: id,
    contaId: account.id,
    plataforma: account.platform,
    comentario: {
      id: comment.id,
      texto: comment.text,
      comentadoEm: comment.createdAt,
      ehResposta: comment.isReply,
      publicacaoId: comment.platformPostId,
      publicacaoZernioId: comment.postId,
      aoVivo: comment.isLive,
    },
    autor: {
      id: comment.author.id,
      usuario: comment.author.username,
      nome: comment.author.name,
      daPropriaConta: comment.author.isOwnAccount,
      seguidor: comment.author.instagramProfile,
    },
    publicacao: { legenda: post.content, miniatura: post.imageUrl, link: post.permalink },
  };
}
