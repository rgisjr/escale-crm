import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Frente F (29/10/2026): os `fetch` crus de Empresas ficavam presos sem fim com o banco engasgado. */
describe("hooks de Empresas com tempo máximo (Frente F)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  function embrulho() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    return { qc, wrapper };
  }

  it("useEmpresa: leitura que não responde vira erro, com a mensagem de tempo esgotado", async () => {
    const { useEmpresa } = await import("@/hooks/escale/useEmpresa");
    const { TEMPO_MAXIMO_DA_LEITURA_MS, MENSAGEM_DE_TEMPO_ESGOTADO } = await import("@/lib/escale/fetch-com-tempo-maximo");
    const { wrapper } = embrulho();
    const { result } = renderHook(() => useEmpresa("e1"), { wrapper });
    // O hook tenta de novo até 2 vezes (10 s cada, mais o recuo do TanStack).
    await act(async () => { await vi.advanceTimersByTimeAsync(TEMPO_MAXIMO_DA_LEITURA_MS * 3 + 10_000); });
    expect(result.current.isError).toBe(true);
    expect((result.current.error as Error).message).toBe(MENSAGEM_DE_TEMPO_ESGOTADO);
  });

  it("useMudarEmpresa: PATCH que não responde rejeita em 20 s com tempoEsgotado", async () => {
    const { useMudarEmpresa } = await import("@/hooks/escale/useEmpresa");
    const { TEMPO_MAXIMO_DA_ESCRITA_MS } = await import("@/lib/escale/fetch-com-tempo-maximo");
    const { wrapper } = embrulho();
    const { result } = renderHook(() => useMudarEmpresa("e1"), { wrapper });
    const promessa = result.current.mudarCampo.mutateAsync({ chave: "nome", valor: "X" });
    const rejeicao = expect(promessa).rejects.toMatchObject({ tempoEsgotado: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(TEMPO_MAXIMO_DA_ESCRITA_MS + 1); });
    await rejeicao;
  });

  it("useEmpresa: 404 continua chegando como ErroDaApiDaEmpresa com status (a ficha separa 'não achei' de 'falhou')", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { message: "Empresa não encontrada." } }), { status: 404 })));
    const { useEmpresa, ErroDaApiDaEmpresa } = await import("@/hooks/escale/useEmpresa");
    const { wrapper } = embrulho();
    const { result } = renderHook(() => useEmpresa("e1"), { wrapper });
    await vi.waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ErroDaApiDaEmpresa);
    expect((result.current.error as InstanceType<typeof ErroDaApiDaEmpresa>).status).toBe(404);
  });

  it("useEmpresaDoContato e useListaDeEmpresas: leitura que não responde vira erro em 10 s", async () => {
    const { useEmpresaDoContato } = await import("@/hooks/escale/useEmpresaDoContato");
    const { useListaDeEmpresas } = await import("@/hooks/escale/useListaDeEmpresas");
    const { TEMPO_MAXIMO_DA_LEITURA_MS } = await import("@/lib/escale/fetch-com-tempo-maximo");
    const { wrapper } = embrulho();
    const a = renderHook(() => useEmpresaDoContato("c1"), { wrapper });
    const b = renderHook(() => useListaDeEmpresas({ e: "com_nome", p: 1, n: 50 }), { wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(TEMPO_MAXIMO_DA_LEITURA_MS + 1); });
    expect(a.result.current.isError).toBe(true);
    expect(b.result.current.isError).toBe(true);
  });
});
