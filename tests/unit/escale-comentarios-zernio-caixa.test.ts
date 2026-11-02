// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  apagarComentario,
  ocultarComentario,
  reexibirComentario,
} from "@/lib/escale/comentarios/zernio";
import {
  lerComentarios,
  lerPublicacoes,
  listarComentarios,
  listarPublicacoesComComentarios,
} from "@/lib/escale/comentarios/zernio-caixa";

/** Fase 10A: a leitura e a moderação de comentários pelo Zernio (fetch dublado). */
const CHAVE = "sk-segredo-123";

function fetchQue(status: number, corpo: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(corpo), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const chamada = (m: ReturnType<typeof fetchQue>) => {
  const [url, init] = m.mock.calls[0] as unknown as [string, RequestInit];
  return { url, init, corpo: init.body ? JSON.parse(init.body as string) : undefined };
};

afterEach(() => vi.unstubAllGlobals());

describe("moderação", () => {
  it("ocultar manda POST …/hide com o accountId e codifica os ids", async () => {
    const m = fetchQue(200, {});
    await ocultarComentario(CHAVE, { postId: "p/1", commentId: "c_1 x", accountId: "acc" });
    const { url, init, corpo } = chamada(m);
    expect(url).toMatch(/\/v1\/inbox\/comments\/p%2F1\/c_1%20x\/hide$/);
    expect(init.method).toBe("POST");
    expect(corpo).toEqual({ accountId: "acc" });
  });

  it("reexibir manda DELETE …/hide?accountId= sem corpo", async () => {
    const m = fetchQue(200, {});
    await reexibirComentario(CHAVE, { postId: "p", commentId: "c", accountId: "a&b" });
    const { url, init } = chamada(m);
    expect(url).toMatch(/\/hide\?accountId=a%26b$/);
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
  });

  it("apagar manda DELETE com accountId e commentId na query", async () => {
    const m = fetchQue(200, {});
    await apagarComentario(CHAVE, { postId: "p 1", commentId: "c/1", accountId: "acc" });
    const { url, init } = chamada(m);
    expect(url).toMatch(/\/v1\/inbox\/comments\/p%201\?accountId=acc&commentId=c%2F1$/);
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
  });

  it("o erro devolvido nunca carrega a chave", async () => {
    fetchQue(500, { error: "falhou" });
    const r = await ocultarComentario(CHAVE, { postId: "p", commentId: "c", accountId: "a" });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain(CHAVE);
  });
});

describe("listagens", () => {
  it("publicações: monta a query com limite, cursor, período e ordem", async () => {
    const m = fetchQue(200, { data: [] });
    await listarPublicacoesComComentarios(CHAVE, { accountId: "acc", cursor: "cur", desde: "2026-10-01T00:00:00.000Z", ordem: "mais_comentarios" });
    const { url, init } = chamada(m);
    const q = new URL(url).searchParams;
    expect(init.method).toBe("GET");
    expect(q.get("accountId")).toBe("acc");
    expect(q.get("limit")).toBe("25");
    expect(q.get("cursor")).toBe("cur");
    expect(q.get("since")).toBe("2026-10-01T00:00:00.000Z");
    expect(q.get("sortBy")).toBe("comments");
  });

  it("comentários: limite 50 e o id da publicação codificado", async () => {
    const m = fetchQue(200, { data: [] });
    await listarComentarios(CHAVE, { accountId: "acc", postId: "p/1", cursor: null });
    const { url } = chamada(m);
    expect(url).toMatch(/\/v1\/inbox\/comments\/p%2F1\?/);
    expect(new URL(url).searchParams.get("limit")).toBe("50");
    expect(new URL(url).searchParams.has("cursor")).toBe(false);
  });

  it("erro do Zernio volta como está", async () => {
    fetchQue(403, { error: "x" });
    expect(await listarComentarios(CHAVE, { accountId: "a", postId: "p", cursor: null })).toEqual({
      ok: false,
      status: 403,
      corpo: { error: "x" },
    });
  });
});

describe("lerPublicacoes", () => {
  it("aceita a lista em data ou em posts, e as variantes dos campos", () => {
    const a = lerPublicacoes({
      data: [
        {
          id: "p1",
          content: "Legenda",
          picture: "https://cdn.x/a.jpg",
          permalink: "https://www.instagram.com/p/abc",
          createdTime: "2026-10-01T00:00:00Z",
          lastCommentTime: "2026-10-02T00:00:00Z",
          commentCount: 7,
          unansweredCount: 3,
        },
      ],
      pagination: { nextCursor: "c2", hasMore: true },
    });
    expect(a).toEqual({
      itens: [
        {
          id: "p1",
          legenda: "Legenda",
          miniatura: "https://cdn.x/a.jpg",
          link: "https://www.instagram.com/p/abc",
          tipo: null,
          publicadaEm: "2026-10-01T00:00:00Z",
          ultimoComentarioEm: "2026-10-02T00:00:00Z",
          comentarios: 7,
          semResposta: 3,
        },
      ],
      proximo: "c2",
    });
    const b = lerPublicacoes({ posts: [{ id: "p2", message: "Oi", thumbnailUrl: "https://cdn.x/b.jpg", unrepliedCount: 0 }], nextCursor: "z" });
    expect(b.itens[0]).toMatchObject({ id: "p2", legenda: "Oi", miniatura: "https://cdn.x/b.jpg", semResposta: 0 });
    expect(b.proximo).toBe("z");
  });

  it("miniatura http/javascript e link de outro domínio viram null", () => {
    const r = lerPublicacoes({
      data: [
        { id: "a", picture: "http://cdn.x/a.jpg", permalink: "https://evil.com/p" },
        { id: "b", picture: "javascript:alert(1)", permalink: "javascript:alert(1)" },
      ],
    });
    expect(r.itens.map((p) => [p.miniatura, p.link])).toEqual([
      [null, null],
      [null, null],
    ]);
  });

  it("item sem id some, lixo vira lista vazia sem lançar, hasMore false zera o cursor", () => {
    expect(lerPublicacoes({ data: [{ message: "sem id" }, null, 5] }).itens).toEqual([]);
    expect(lerPublicacoes("lixo")).toEqual({ itens: [], proximo: null });
    expect(lerPublicacoes(null)).toEqual({ itens: [], proximo: null });
    expect(lerPublicacoes({ data: [], pagination: { nextCursor: "x", hasMore: false } }).proximo).toBeNull();
  });
});

describe("lerComentarios", () => {
  it("lê from/message/replies e marca a própria conta por isOwner ou pelo id", () => {
    const r = lerComentarios(
      {
        comments: [
          {
            id: "c1",
            message: "Quanto custa?",
            createdTime: "2026-11-01T10:00:00Z",
            from: { id: "u1", username: "ana", name: "Ana", picture: "https://cdn.x/f.jpg" },
            isHidden: true,
            likeCount: 2,
            replies: [
              { id: "r1", text: "R$ 10", createdAt: "2026-11-01T11:00:00Z", author: { id: "conta-1", username: "empresa" } },
              { id: "r2", message: "Obrigada", createdTime: "2026-11-01T12:00:00Z", from: { id: "u1", isOwner: true } },
            ],
          },
        ],
      },
      "conta-1",
    );
    const c = r.itens[0]!;
    expect(c).toMatchObject({ id: "c1", texto: "Quanto custa?", oculto: true, curtidas: 2, curtido: null });
    expect(c.autor).toEqual({ id: "u1", usuario: "ana", nome: "Ana", foto: "https://cdn.x/f.jpg", daPropriaConta: false });
    expect(c.respostas.map((x) => [x.id, x.autor.daPropriaConta])).toEqual([
      ["r1", true],
      ["r2", true],
    ]);
  });

  it("replies como objeto { data } e foto http vira null", () => {
    const r = lerComentarios(
      {
        data: [
          {
            id: "c1",
            message: "oi",
            createdTime: "2026-11-01T10:00:00Z",
            from: { id: "u1", picture: "http://x/f.jpg" },
            replies: { data: [{ id: "r1", message: "a", from: { id: "u2" } }] },
          },
        ],
      },
      "conta",
    );
    expect(r.itens[0]!.autor.foto).toBeNull();
    expect(r.itens[0]!.respostas).toHaveLength(1);
  });

  it("comentário sem id ou sem autor some; resposta de resposta é descartada", () => {
    const r = lerComentarios(
      {
        data: [
          { id: "sem-autor", message: "x" },
          { message: "sem id", from: { id: "u" } },
          {
            id: "c1",
            from: { id: "u" },
            replies: [{ id: "r1", from: { id: "v" }, replies: [{ id: "rr", from: { id: "w" } }] }],
          },
        ],
      },
      "conta",
    );
    expect(r.itens.map((c) => c.id)).toEqual(["c1"]);
    expect(r.itens[0]!.respostas[0]!.respostas).toEqual([]);
  });
});
