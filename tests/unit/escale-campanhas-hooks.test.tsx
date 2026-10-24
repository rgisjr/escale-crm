import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const realtime = vi.fn();
vi.mock("@/hooks/realtime/useRealtimeChannel", () => ({
  useRealtimeChannel: (o: unknown) => {
    realtime(o);
    return { status: "subscribed", ultimaEntrega: { current: null } };
  },
}));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

import {
  CHAVE_DAS_CAMPANHAS,
  caminhoDaAcao,
  reconsultaDaLista,
  useAcoesDaCampanha,
  useCampanhasAoVivo,
  useListaDeCampanhas,
} from "@/hooks/escale/useCampanhasDaCasca";
import { apiClient } from "@/lib/api/client";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";

const envolver = (qc: QueryClient) =>
  function Envolto({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
const novoQc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("caminhos e reconsulta", () => {
  it("as ações do original e as do fork", () => {
    expect(caminhoDaAcao({ id: "c1", acao: "pausar" })).toEqual({
      metodo: "post",
      url: "/api/v1/campaigns/c1/pausar",
    });
    expect(caminhoDaAcao({ id: "c1", acao: "duplicar" })).toEqual({
      metodo: "post",
      url: "/api/v1/campanhas-da-casca/c1/duplicar",
    });
    expect(caminhoDaAcao({ id: "c1", acao: "rascunho" })).toEqual({
      metodo: "post",
      url: "/api/v1/campanhas-da-casca/c1/rascunho",
    });
    expect(
      caminhoDaAcao({ id: "c1", acao: "reagendar", quando: "2026-10-20T12:00:00.000Z" }),
    ).toEqual({
      metodo: "post",
      url: "/api/v1/campanhas-da-casca/c1/reagendar",
      corpo: { scheduled_at: "2026-10-20T12:00:00.000Z" },
    });
    expect(caminhoDaAcao({ id: "c1", acao: "excluir" })).toEqual({
      metodo: "delete",
      url: "/api/v1/campanhas-da-casca/c1",
    });
  });

  it("reconsulta só com campanha andando na página", () => {
    const pagina = (status: LinhaDeCampanha["status"]) => ({
      linhas: [{ status } as LinhaDeCampanha],
      total: 1,
      pagina: 1,
      porPagina: 10,
    });
    expect(reconsultaDaLista(pagina("running"))).toBe(10_000);
    expect(reconsultaDaLista(pagina("preparing"))).toBe(10_000);
    expect(reconsultaDaLista(pagina("completed"))).toBe(false);
    expect(reconsultaDaLista(undefined)).toBe(false);
  });
});

describe("useListaDeCampanhas", () => {
  it("pede a página com o filtro enxuto", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { linhas: [], total: 0, pagina: 2, porPagina: 25 },
    } as never);
    const { result } = renderHook(
      () => useListaDeCampanhas({ busca: " Reat ", status: [] }, 2, 25),
      {
        wrapper: envolver(novoQc()),
      },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith(
      `/api/v1/campanhas-da-casca?p=2&n=25&f=${encodeURIComponent(JSON.stringify({ busca: "Reat" }))}`,
    );
  });
});

describe("useCampanhasAoVivo", () => {
  it("assina campaigns da organização e invalida a lista no evento", () => {
    const qc = novoQc();
    const invalidar = vi.spyOn(qc, "invalidateQueries");
    renderHook(() => useCampanhasAoVivo("org-1"), { wrapper: envolver(qc) });
    const opcoes = realtime.mock.calls.at(-1)![0] as {
      postgresChanges: { table: string; filter: string };
      onChange: () => void;
    };
    expect(opcoes.postgresChanges).toMatchObject({
      table: "campaigns",
      filter: "organization_id=eq.org-1",
    });
    act(() => opcoes.onChange());
    expect(invalidar).toHaveBeenCalledWith({ queryKey: [CHAVE_DAS_CAMPANHAS] });
  });
});

describe("useAcoesDaCampanha", () => {
  it("excluir vai pelo DELETE do fork; duplicar devolve o id da cópia", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { id: "c1" } } as never);
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: "c9" } } as never);
    const { result } = renderHook(() => useAcoesDaCampanha(), { wrapper: envolver(novoQc()) });
    await act(async () => {
      await result.current.mutateAsync({ id: "c1", acao: "excluir" });
    });
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/campanhas-da-casca/c1");
    let copia: unknown;
    await act(async () => {
      copia = await result.current.mutateAsync({ id: "c1", acao: "duplicar" });
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/campanhas-da-casca/c1/duplicar", {});
    expect(copia).toEqual({ id: "c9" });
  });
});
