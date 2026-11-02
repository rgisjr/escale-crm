import { describe, expect, it } from "vitest";

import { lerComentarioDoWebhook } from "@/lib/escale/comentarios/webhook";

/** Fase 10B: o payload `comment.received` do Zernio. */
const completo = () => ({
  event: "comment.received",
  id: "evt-1",
  account: { id: "acc-1", platform: "instagram", username: "oregismarques" },
  comment: {
    id: "c-1",
    text: "Quero o link",
    createdAt: "2026-11-01T10:00:00.000Z",
    isReply: false,
    platformPostId: "179123",
    postId: "zpost-1",
    isLive: false,
    author: { id: "u-1", username: "fulano", name: "Fulano", isOwnAccount: false },
  },
  post: { content: "Legenda", imageUrl: "https://img/1.jpg", permalink: "https://instagram.com/p/1" },
});

describe("lerComentarioDoWebhook", () => {
  it("lê o payload completo", () => {
    expect(lerComentarioDoWebhook(completo())).toEqual({
      eventoId: "evt-1",
      contaId: "acc-1",
      plataforma: "instagram",
      comentario: {
        id: "c-1",
        texto: "Quero o link",
        comentadoEm: "2026-11-01T10:00:00.000Z",
        ehResposta: false,
        publicacaoId: "179123",
        publicacaoZernioId: "zpost-1",
        aoVivo: false,
      },
      autor: { id: "u-1", usuario: "fulano", nome: "Fulano", daPropriaConta: false, seguidor: null },
      publicacao: { legenda: "Legenda", miniatura: "https://img/1.jpg", link: "https://instagram.com/p/1" },
    });
  });
  it("isOwnAccount ausente vale false", () => {
    const p = completo();
    delete (p.comment.author as Record<string, unknown>).isOwnAccount;
    expect(lerComentarioDoWebhook(p)?.autor.daPropriaConta).toBe(false);
  });
  it("outro evento → null", () => {
    expect(lerComentarioDoWebhook({ ...completo(), event: "message.received" })).toBeNull();
  });
  it("sem o id do autor → null", () => {
    const p = completo();
    delete (p.comment.author as Record<string, unknown>).id;
    expect(lerComentarioDoWebhook(p)).toBeNull();
  });
  it("post.content nulo → legenda null", () => {
    const p = { ...completo(), post: { content: null } };
    expect(lerComentarioDoWebhook(p)?.publicacao.legenda).toBeNull();
  });
  it("sem o campo post → publicação vazia", () => {
    const { post: _post, ...sem } = completo();
    expect(lerComentarioDoWebhook(sem)?.publicacao).toEqual({ legenda: null, miniatura: null, link: null });
  });
});
