import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const consulta = vi.hoisted(() => ({
  valor: { data: undefined as unknown, dataUpdatedAt: 0 },
  chamadas: [] as Array<[boolean, number | false]>,
}));
vi.mock("@/hooks/escale/useAcoesEmMassa", () => ({
  useAcoesEmMassa: (ativo: boolean, intervalo: number | false) => {
    consulta.chamadas.push([ativo, intervalo]);
    return consulta.valor;
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (x: string) => x }));
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

import { useAcaoDaFila } from "@/hooks/escale/useAcoesEmMassaDaFila";
import { useAcompanharAcoes } from "@/hooks/escale/useAcompanharAcoes";

const envolver = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe("useAcompanharAcoes: id que não aparece mais (Q5, B3-7/B9-14)", () => {
  beforeEach(() => {
    window.sessionStorage.setItem(
      "escale:contatos:acoes",
      JSON.stringify([{ id: "sumida", acao: "excluir" }]),
    );
    consulta.chamadas.length = 0;
  });

  it("depois de respostas seguidas sem o id, deixa de acompanhar e limpa o storage", () => {
    consulta.valor = { data: { minhas: [] }, dataUpdatedAt: 1 };
    const { rerender } = renderHook(() => useAcompanharAcoes(), { wrapper: envolver });
    for (const n of [2, 3, 4]) {
      consulta.valor = { data: { minhas: [] }, dataUpdatedAt: n };
      act(() => rerender());
    }
    expect(window.sessionStorage.getItem("escale:contatos:acoes")).toBe("[]");
    expect(consulta.chamadas.at(-1)).toEqual([false, 30_000]);
  });
});

describe("useAcaoDaFila: erros seguidos (Q5, B1-4)", () => {
  it("para de perguntar a cada 3 s depois de vários erros", async () => {
    api.get.mockRejectedValue(new Error("404"));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useAcaoDaFila("a1"), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });
    const consultaDaAcao = qc.getQueryCache().find({ queryKey: ["acao-em-massa-da-fila", "a1"] });
    const intervalo = consultaDaAcao?.observers[0]?.options.refetchInterval as (
      q: unknown,
    ) => number | false;
    expect(intervalo({ state: { data: undefined, errorUpdateCount: 1 } })).toBe(3000);
    expect(intervalo({ state: { data: undefined, errorUpdateCount: 5 } })).toBe(false);
  });
});
