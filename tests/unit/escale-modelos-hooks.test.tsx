import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { CHAVE_DOS_MODELOS, useAcoesDosModelos, useModelos } from "@/hooks/escale/useModelosDeIndicadores";
import { CHAVE_DOS_PAINEIS } from "@/hooks/escale/usePaineisDaCasca";
import { apiClient } from "@/lib/api/client";

const BASE = "/api/v1/indicadores-da-casca";
const envolver = (qc: QueryClient) =>
  function Envolto({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
const novoQc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("useModelos", () => {
  it("desligado não busca; ligado devolve data.modelos", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { modelos: [{ id: "atendimentos" }] } });
    renderHook(() => useModelos(false), { wrapper: envolver(novoQc()) });
    expect(apiClient.get).not.toHaveBeenCalled();
    const { result } = renderHook(() => useModelos(true), { wrapper: envolver(novoQc()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith(`${BASE}/modelos`);
    expect(result.current.data).toEqual([{ id: "atendimentos" }]);
  });
});

describe("useAcoesDosModelos", () => {
  const filtros = { gruposDeOrigem: [], origens: [], usuarios: [], tags: [] };
  it.each([
    ["usar", { modelo: { origem: "sistema", id: "atendimentos" }, filtros }, "post", [`${BASE}/modelos/usar`, { modelo: { origem: "sistema", id: "atendimentos" }, filtros }], CHAVE_DOS_PAINEIS],
    ["tornarTemplate", "p1", "post", [`${BASE}/paineis/p1/tornar-template`, {}], CHAVE_DOS_MODELOS],
    ["excluirTemplate", "t1", "delete", [`${BASE}/modelos/t1`], CHAVE_DOS_MODELOS],
  ] as const)("%s chama a rota certa e invalida a lista certa", async (acao, variavel, metodo, args, chave) => {
    vi.mocked(apiClient[metodo]).mockResolvedValue({ data: { id: "p9" } });
    const qc = novoQc();
    const invalidar = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useAcoesDosModelos(), { wrapper: envolver(qc) });
    let devolvido: unknown;
    await act(async () => {
      devolvido = await (result.current[acao].mutateAsync as (v: unknown) => Promise<unknown>)(variavel);
    });
    expect(apiClient[metodo]).toHaveBeenCalledWith(...args);
    expect(devolvido).toEqual({ id: "p9" });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: [chave] });
  });
});
