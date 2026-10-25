import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { TEMPO_LIMITE_DO_ENVIO_MS, useCriarImportacao } from "@/hooks/escale/useImportacoes";
import type { PedidoDeImportacao } from "@/lib/escale/importacao/tipos";

const envolver = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);
const arquivo = new File(["Nome\nAna\n"], "c.csv", { type: "text/csv" });
const pedido = {} as PedidoDeImportacao;

/** fetch que só termina quando o sinal aborta (conexão pendurada). */
const fetchPendurado = () =>
  vi.fn(
    (_url: string, init: RequestInit) =>
      new Promise((_ok, falha) =>
        init.signal?.addEventListener("abort", () =>
          falha(new DOMException("abortado", "AbortError")),
        ),
      ),
  );

describe("useCriarImportacao: envio com tempo limite e cancelamento (Q5, B5-2)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("desiste do envio pendurado depois do tempo limite, com mensagem clara", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.stubGlobal("fetch", fetchPendurado());
    const { result } = renderHook(() => useCriarImportacao(), { wrapper: envolver });
    result.current.mutate({ arquivo, pedido });
    await vi.advanceTimersByTimeAsync(TEMPO_LIMITE_DO_ENVIO_MS + 10);
    vi.useRealTimers();
    await waitFor(() => expect(result.current.error?.message).toMatch(/demorou demais/));
  });

  it("aborta o fetch quando quem chamou cancela", async () => {
    const f = fetchPendurado();
    vi.stubGlobal("fetch", f);
    const { result } = renderHook(() => useCriarImportacao(), { wrapper: envolver });
    const cancelar = new AbortController();
    result.current.mutate({ arquivo, pedido, signal: cancelar.signal });
    await waitFor(() => expect(f).toHaveBeenCalled());
    cancelar.abort();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).not.toMatch(/demorou demais/);
  });
});
