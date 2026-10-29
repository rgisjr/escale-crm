import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Frente F (29/10/2026): seis lugares da casca usavam `fetch` cru e, com o banco
 * engasgado (plano Free, 426 MB), ficavam presos sem fim. Um helper só: aborta
 * em 20 s (escrita) ou 10 s (leitura) e rejeita com um erro tipado e uma
 * mensagem de tela. O servidor não cancela nada: quem estoura confere a lista.
 */
describe("fetchComTempoMaximo (Frente F)", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("POST sem resposta aborta em 20 s e rejeita com ErroDeTempoEsgotado", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { fetchComTempoMaximo, ErroDeTempoEsgotado, TEMPO_MAXIMO_DA_ESCRITA_MS, MENSAGEM_DE_TEMPO_ESGOTADO } = await import("@/lib/escale/fetch-com-tempo-maximo");
    const promessa = fetchComTempoMaximo("/api/v1/empresas", { method: "POST" });
    const rejeicao = expect(promessa).rejects.toSatisfy((e: unknown) => e instanceof ErroDeTempoEsgotado && e.message === MENSAGEM_DE_TEMPO_ESGOTADO);
    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    expect(init.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(TEMPO_MAXIMO_DA_ESCRITA_MS - 1);
    expect(init.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(init.signal?.aborted).toBe(true);
    await rejeicao;
  });

  it("GET usa 10 s", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { fetchComTempoMaximo, TEMPO_MAXIMO_DA_LEITURA_MS } = await import("@/lib/escale/fetch-com-tempo-maximo");
    const promessa = fetchComTempoMaximo("/api/v1/empresas/1").catch((e: Error) => e);
    await vi.advanceTimersByTimeAsync(TEMPO_MAXIMO_DA_LEITURA_MS + 1);
    expect((await promessa) as Error).toMatchObject({ tempoEsgotado: true });
  });

  it("resposta a tempo volta inteira e o relógio é limpo; headers do init são preservados", async () => {
    const resposta = new Response("{}", { status: 200 });
    vi.stubGlobal("fetch", vi.fn(async () => resposta));
    const { fetchComTempoMaximo } = await import("@/lib/escale/fetch-com-tempo-maximo");
    const r = await fetchComTempoMaximo("/x", { method: "PATCH", headers: { "x-org-da-aba": "o1" } });
    expect(r).toBe(resposta);
    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["x-org-da-aba"]).toBe("o1");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("erro de rede que não é abort passa adiante como está", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const { fetchComTempoMaximo } = await import("@/lib/escale/fetch-com-tempo-maximo");
    await expect(fetchComTempoMaximo("/x")).rejects.toThrow("Failed to fetch");
  });
});
