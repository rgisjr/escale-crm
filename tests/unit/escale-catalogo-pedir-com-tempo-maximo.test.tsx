import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Frente E (29/10/2026): o POST do catálogo era um `fetch` cru. Com o banco
 * engasgado, "Adicionar campo" ficava preso sem fim. Agora desiste em
 * TEMPO_MAXIMO_MS com uma mensagem clara, e o catálogo é recarregado para a
 * pessoa ver se o campo entrou (o servidor pode ter gravado depois do corte).
 */
describe("pedir do catálogo de campos com tempo máximo (Frente E)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => new Promise((_ok, falhar) => {
        init?.signal?.addEventListener("abort", () => falhar(new DOMException("Aborted", "AbortError")));
      })),
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function montar() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const espia = vi.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    return { qc, espia, wrapper };
  }

  it("criar campo que não responde rejeita com 'Demorou demais' e recarrega o catálogo do objeto", async () => {
    const { useMudarCatalogo, TEMPO_MAXIMO_MS } = await import("@/hooks/escale/useCatalogoDeCampos");
    const { espia, wrapper } = montar();
    const { result } = renderHook(() => useMudarCatalogo("negocio"), { wrapper });
    const promessa = result.current.criarCampo.mutateAsync({ objeto: "negocio", nome: "Link WhatsApp", grupo_id: "g", tipo: "TEXT" } as never);
    const rejeicao = expect(promessa).rejects.toMatchObject({ tempoEsgotado: true, message: expect.stringContaining("Demorou demais") });
    await act(async () => { await vi.advanceTimersByTimeAsync(TEMPO_MAXIMO_MS + 1); });
    await rejeicao;
    expect(espia.mock.calls.map((c) => c[0]?.queryKey)).toContainEqual(["catalogo-de-campos", "negocio"]);
  });

  it("o fetch recebe um AbortSignal e o abort acontece no tempo máximo", async () => {
    const { useMudarCatalogo, TEMPO_MAXIMO_MS } = await import("@/hooks/escale/useCatalogoDeCampos");
    const { wrapper } = montar();
    const { result } = renderHook(() => useMudarCatalogo("contato"), { wrapper });
    const promessa = result.current.excluirCampo.mutateAsync("c1").catch(() => undefined);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal?.aborted).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(TEMPO_MAXIMO_MS + 1); });
    expect(init.signal?.aborted).toBe(true);
    await promessa;
  });

  it("erro do servidor (422) continua chegando com a mensagem dele, sem tempoEsgotado", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { message: "Já existe um outro campo com o nome informado" } }), { status: 422 })));
    const { useMudarCatalogo } = await import("@/hooks/escale/useCatalogoDeCampos");
    const { wrapper } = montar();
    const { result } = renderHook(() => useMudarCatalogo("negocio"), { wrapper });
    await expect(result.current.criarCampo.mutateAsync({ objeto: "negocio", nome: "X", grupo_id: "g", tipo: "TEXT" } as never))
      .rejects.toMatchObject({ tempoEsgotado: false, message: "Já existe um outro campo com o nome informado" });
  });
});
