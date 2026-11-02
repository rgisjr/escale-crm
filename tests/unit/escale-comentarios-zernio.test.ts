// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EXPLICACAO_DO_MOTIVO,
  motivoDoErro,
  publicacoesDaConta,
  respostaPrivada,
  responderComentario,
} from "@/lib/escale/comentarios/zernio";

/** Fase 10B: o cliente HTTP do Zernio para comentário (fetch dublado). */
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

describe("respostaPrivada", () => {
  it("manda POST …/private-reply com o Authorization e os botões como link", async () => {
    const m = fetchQue(200, { messageId: "m-1", commentId: "c-1", platform: "instagram" });
    const r = await respostaPrivada(CHAVE, {
      postId: "zp 1",
      commentId: "c/1",
      accountId: "acc-1",
      texto: "Oi!",
      botoes: [{ titulo: "Ver", url: "https://a.com" }],
    });
    expect(r).toEqual({ ok: true, dados: { messageId: "m-1" } });
    const { url, init, corpo } = chamada(m);
    expect(url).toMatch(/\/v1\/inbox\/comments\/zp%201\/c%2F1\/private-reply$/);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${CHAVE}`);
    expect(corpo).toEqual({ accountId: "acc-1", message: "Oi!", buttons: [{ type: "url", title: "Ver", url: "https://a.com" }] });
  });

  it("sem botão não manda o campo buttons", async () => {
    const m = fetchQue(200, { messageId: "m-1" });
    await respostaPrivada(CHAVE, { postId: "p", commentId: "c", accountId: "a", texto: "Oi", botoes: [] });
    expect(chamada(m).corpo).toEqual({ accountId: "a", message: "Oi" });
  });

  it("devolve status e corpo do erro, sem a chave", async () => {
    fetchQue(400, { error: "ruim", details: { privateReplyConsumed: true } });
    const r = await respostaPrivada(CHAVE, { postId: "p", commentId: "c", accountId: "a", texto: "Oi", botoes: [] });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain(CHAVE);
    if (!r.ok) expect(motivoDoErro(r.status, r.corpo)).toBe("resposta_privada_ja_usada");
  });

  it("rede fora → status 0", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("rede"))));
    const r = await respostaPrivada(CHAVE, { postId: "p", commentId: "c", accountId: "a", texto: "Oi", botoes: [] });
    expect(r).toEqual({ ok: false, status: 0, corpo: null });
  });
});

describe("responderComentario", () => {
  it("manda o Idempotency-Key e lê o commentId", async () => {
    const m = fetchQue(200, { success: true, data: { commentId: "r-9" } });
    const r = await responderComentario(CHAVE, {
      postId: "p", commentId: "c", accountId: "a", texto: "Valeu", idempotencia: "disp-1",
    });
    expect(r).toEqual({ ok: true, dados: { commentId: "r-9" } });
    const { url, init, corpo } = chamada(m);
    expect(url).toMatch(/\/v1\/inbox\/comments\/p$/);
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("disp-1");
    expect(corpo).toEqual({ accountId: "a", message: "Valeu", commentId: "c" });
  });
});

describe("publicacoesDaConta", () => {
  it("mapeia posts[] e ignora os sem id", async () => {
    const m = fetchQue(200, {
      posts: [
        { id: "179", message: "Promo", picture: "https://i/1.jpg", mediaType: "REELS", createdTime: "2026-10-30T10:00:00Z", permalink: "https://ig/p/1", commentCount: 4 },
        { message: "sem id" },
      ],
    });
    const r = await publicacoesDaConta(CHAVE, "acc-1");
    expect(chamada(m).url).toMatch(/\/v1\/accounts\/acc-1\/posts$/);
    expect(r).toEqual({
      ok: true,
      dados: [{ id: "179", legenda: "Promo", miniatura: "https://i/1.jpg", tipo: "REELS", criadaEm: "2026-10-30T10:00:00Z", link: "https://ig/p/1", comentarios: 4 }],
    });
  });
});

describe("motivoDoErro (D10)", () => {
  it("os seis casos", () => {
    expect(motivoDoErro(401, {})).toBe("acesso_recusado");
    expect(motivoDoErro(403, {})).toBe("acesso_recusado");
    expect(motivoDoErro(400, { details: { privateReplyConsumed: true } })).toBe("resposta_privada_ja_usada");
    expect(motivoDoErro(400, { details: { error: { code: 2, error_subcode: 1545133 } } })).toBe("botoes_recusados");
    expect(motivoDoErro(400, { error: { code: 2, subcode: 1545133 } })).toBe("botoes_recusados");
    expect(motivoDoErro(502, { details: { privateReplyOutcome: "unknown" } })).toBe("resultado_incerto");
    expect(motivoDoErro(500, null)).toBe("provedor_indisponivel");
    expect(motivoDoErro(0, null)).toBe("provedor_indisponivel");
  });
  it("todo motivo tem explicação", () => {
    expect(EXPLICACAO_DO_MOTIVO.prazo_vencido).toMatch(/7 dias/);
    expect(Object.keys(EXPLICACAO_DO_MOTIVO)).toHaveLength(10);
  });
});
