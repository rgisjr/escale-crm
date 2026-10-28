import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { CHAVE_DOS_PAINEIS, useAcoesDosPaineis, usePaineis } from "@/hooks/escale/usePaineisDaCasca";
import { apiClient } from "@/lib/api/client";

const BASE = "/api/v1/indicadores-da-casca/paineis";
const envolver = (qc: QueryClient) =>
  function Envolto({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
const novoQc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("usePaineis", () => {
  it("devolve data.paineis", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { paineis: [{ id: "p1", nome: "Vendas" }] } });
    const { result } = renderHook(() => usePaineis(), { wrapper: envolver(novoQc()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith(BASE);
    expect(result.current.data).toEqual([{ id: "p1", nome: "Vendas" }]);
  });
});

describe("useAcoesDosPaineis", () => {
  it.each([
    ["criar", undefined, "post", [BASE, {}]],
    ["editar", { id: "p1", edicao: { nome: "X" } }, "patch", [`${BASE}/p1`, { nome: "X" }]],
    ["duplicar", "p1", "post", [`${BASE}/p1/duplicar`, {}]],
    ["excluir", "p1", "delete", [`${BASE}/p1`]],
  ] as const)("%s chama a rota certa, devolve o id e invalida a lista", async (acao, variavel, metodo, args) => {
    vi.mocked(apiClient[metodo]).mockResolvedValue({ data: { id: "p9" } });
    const qc = novoQc();
    const invalidar = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useAcoesDosPaineis(), { wrapper: envolver(qc) });
    let devolvido: unknown;
    await act(async () => {
      devolvido = await (result.current[acao].mutateAsync as (v: unknown) => Promise<unknown>)(variavel);
    });
    expect(apiClient[metodo]).toHaveBeenCalledWith(...args);
    expect(devolvido).toEqual({ id: "p9" });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: [CHAVE_DOS_PAINEIS] });
  });
});
