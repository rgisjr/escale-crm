import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useListaDeContatos } from "@/hooks/escale/useListaDeContatos";
import { useListaDeEmpresas } from "@/hooks/escale/useListaDeEmpresas";
import { apiClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn() } }));

function embrulho() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
}

const chamadas = () => vi.mocked(apiClient.get).mock.calls.map((c) => String(c[0]));

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.get).mockImplementation(async (url: string) =>
    url.includes("/total")
      ? { data: { total: 123 } }
      : { data: { linhas: [], pagina: 1, porPagina: 50 } },
  );
});

describe("useListaDeContatos (Q7d)", () => {
  it("junta a página e o total, e trocar de página não pede o total de novo", async () => {
    const { Wrapper } = embrulho();
    const { result, rerender } = renderHook(
      ({ p }) => useListaDeContatos({ q: "ana", v: "todos", p, n: 50, f: null }),
      { wrapper: Wrapper, initialProps: { p: 1 } },
    );
    await waitFor(() => expect(result.current.data?.total).toBe(123));
    expect(result.current.data).toMatchObject({ linhas: [], pagina: 1, porPagina: 50, total: 123 });

    await act(async () => rerender({ p: 2 }));
    await waitFor(() => expect(chamadas().filter((u) => !u.includes("/total"))).toHaveLength(2));

    const totais = chamadas().filter((u) => u.includes("/lista-de-contatos/total"));
    expect(totais).toHaveLength(1); // a chave do total não tem página
    expect(totais[0]).not.toMatch(/[?&](p|n)=/);
    expect(totais[0]).toContain("q=ana");
    expect(totais[0]).toContain("v=todos");
    // enquanto a página nova carrega, o total já lido continua na tela
    expect(result.current.data?.total).toBe(123);
  });

  it("mudar o filtro pede um total novo", async () => {
    const { Wrapper } = embrulho();
    const { rerender } = renderHook(({ q }) => useListaDeContatos({ q, v: "todos", p: 1, n: 50 }), {
      wrapper: Wrapper,
      initialProps: { q: "ana" },
    });
    await waitFor(() => expect(chamadas().filter((u) => u.includes("/total"))).toHaveLength(1));
    await act(async () => rerender({ q: "bruno" }));
    await waitFor(() => expect(chamadas().filter((u) => u.includes("/total"))).toHaveLength(2));
  });

  it("falha do total aparece como erro da lista", async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url.includes("/total")) throw new Error("falhou");
      return { data: { linhas: [], pagina: 1, porPagina: 50 } };
    });
    const { Wrapper } = embrulho();
    const { result } = renderHook(() => useListaDeContatos({ v: "todos", p: 1, n: 50 }), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

describe("useListaDeEmpresas (Q7d)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () =>
          url.includes("/total")
            ? { data: { total: 40 } }
            : { data: { linhas: [], pagina: 1, porPagina: 25, moeda: "BRL" } },
      })),
    );
  });

  it("junta a página e o total, e trocar de página não pede o total de novo", async () => {
    const { Wrapper } = embrulho();
    const { result, rerender } = renderHook(
      ({ p }) => useListaDeEmpresas({ q: "atlas", e: "todas", p, n: 25 }),
      { wrapper: Wrapper, initialProps: { p: 1 } },
    );
    await waitFor(() => expect(result.current.data?.total).toBe(40));
    await act(async () => rerender({ p: 2 }));
    const urls = () => vi.mocked(fetch).mock.calls.map((c) => String(c[0]));
    await waitFor(() => expect(urls().filter((u) => !u.includes("/total"))).toHaveLength(2));
    const totais = urls().filter((u) => u.includes("/api/v1/empresas/total"));
    expect(totais).toHaveLength(1);
    expect(totais[0]).not.toMatch(/[?&](p|n)=/);
    expect(totais[0]).toContain("q=atlas");
  });
});
