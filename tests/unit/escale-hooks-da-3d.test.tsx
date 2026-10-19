import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

import { useAcaoDaFila, useExecutarAcaoDaFila } from "@/hooks/escale/useAcoesEmMassaDaFila";
import { useGruposDasOrigens } from "@/hooks/escale/useGruposDasOrigens";
import { useTotalDaFila } from "@/hooks/escale/useTotalDaFila";

const envolver = (qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })) =>
  function Envolto({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };

describe("hooks da 3D", () => {
  it("o total lê a rota com o mesmo painel da fila, só quando ativo", async () => {
    api.get.mockResolvedValueOnce({ data: { total: 56128 } });
    const { result, rerender } = renderHook(
      ({ ativo }) => useTotalDaFila({ painel: { canais: [] }, ordem: "interacao" }, ativo),
      {
        wrapper: envolver(),
        initialProps: { ativo: false },
      },
    );
    expect(api.get).not.toHaveBeenCalled();
    rerender({ ativo: true });
    await waitFor(() => expect(result.current.data).toBe(56128));
    expect(api.get).toHaveBeenCalledWith("/api/v1/fila-da-casca/total");
  });

  it("executar posta o pedido; acompanhar lê a ação", async () => {
    api.post.mockResolvedValueOnce({ data: { id: "a1", total: 2, status: "concluida" } });
    api.get.mockResolvedValueOnce({
      data: { id: "a1", acao: "status", status: "concluida", total: 2, feitos: 2, falhas: 0 },
    });
    const { result } = renderHook(
      () => ({ exec: useExecutarAcaoDaFila(), acao: useAcaoDaFila("a1") }),
      { wrapper: envolver() },
    );
    await act(async () => {
      await result.current.exec.mutateAsync({
        acao: "status",
        alvo: { tipo: "ids", ids: ["x"] },
        parametros: { status: "fechado" },
      });
    });
    expect(api.post).toHaveBeenCalledWith(
      "/api/v1/acoes-em-massa-conversas",
      expect.objectContaining({ acao: "status" }),
    );
    await waitFor(() => expect(result.current.acao.data?.feitos).toBe(2));
  });

  it("os grupos de origens: só os ativos, por nome", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        grupos: [
          { id: "g2", name: "Vendas", is_archived: false },
          { id: "g1", name: "Antigo", is_archived: true },
        ],
        funis: [],
      },
    });
    const { result } = renderHook(() => useGruposDasOrigens(), { wrapper: envolver() });
    await waitFor(() => expect(result.current.data).toEqual([{ id: "g2", nome: "Vendas" }]));
  });
});
