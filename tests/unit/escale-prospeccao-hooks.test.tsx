import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  reconsultaDaLista,
  reconsultaDoDetalhe,
  useAcaoDaProspeccao,
  useDetalheDaProspeccao,
  useListaDeProspeccoes,
} from "@/hooks/escale/useProspeccaoDaCasca";
import { apiClient } from "@/lib/api/client";
import { detalhe, ID, linha } from "@/tests/helpers/prospeccao-fixtures";

vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));

function envoltorio() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidar = vi.spyOn(qc, "invalidateQueries");
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { Wrapper, invalidar };
}

beforeEach(() => vi.mocked(apiClient.get).mockReset());

describe("reconsulta", () => {
  it("lista: 10 s enquanto alguma busca ou aborda", () => {
    expect(
      reconsultaDaLista({
        linhas: [linha({ situacao: "completa" })],
        total: 1,
        pagina: 1,
        porPagina: 10,
      }),
    ).toBe(false);
    expect(
      reconsultaDaLista({
        linhas: [linha({ situacao: "buscando" })],
        total: 1,
        pagina: 1,
        porPagina: 10,
      }),
    ).toBe(10_000);
    expect(reconsultaDaLista(undefined)).toBe(false);
  });

  it("detalhe: 5 s buscando, 10 s abordando, parado no resto", () => {
    expect(reconsultaDoDetalhe(detalhe({ linha: linha({ situacao: "buscando" }) }))).toBe(5_000);
    expect(reconsultaDoDetalhe(detalhe())).toBe(10_000);
    expect(reconsultaDoDetalhe(detalhe({ linha: linha({ situacao: "pausada" }) }))).toBe(false);
  });
});

describe("hooks", () => {
  it("a lista pede a URL com os filtros", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { linhas: [], total: 0, pagina: 1, porPagina: 10 },
    });
    const { Wrapper } = envoltorio();
    const { result } = renderHook(() => useListaDeProspeccoes({ busca: "clin" }, 1, 10), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/prospeccao-da-casca?p=1&n=10&q=clin");
  });

  it("o detalhe sem id não consulta", () => {
    const { Wrapper } = envoltorio();
    renderHook(() => useDetalheDaProspeccao(null), { wrapper: Wrapper });
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("a ação vai ao POST do original, devolve o data e invalida a prospecção", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { paused: true } });
    const { Wrapper, invalidar } = envoltorio();
    const { result } = renderHook(() => useAcaoDaProspeccao(), { wrapper: Wrapper });
    let resposta: unknown;
    await act(async () => {
      resposta = await result.current.mutateAsync({ action: "pause", id: ID });
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/prospecting", { action: "pause", id: ID });
    expect(resposta).toEqual({ paused: true });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ["prospeccao-da-casca"] });
  });
});
