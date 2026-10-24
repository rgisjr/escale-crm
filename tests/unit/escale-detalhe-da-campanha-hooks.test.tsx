import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock("@/lib/escale/exportar/baixar", () => ({ baixarCsv: vi.fn() }));

import {
  baixarCsvDaCampanha,
  chaveDoDetalhe,
  reconsultaDoDetalhe,
  useDestinatariosDaCampanha,
  useDetalheDaCampanha,
  useMassaDaCampanha,
  useRitmoDaCampanha,
} from "@/hooks/escale/useDetalheDaCampanha";
import { apiClient } from "@/lib/api/client";
import type { DadosDoDetalhe } from "@/lib/escale/campanhas/detalhe/tipos";
import { baixarCsv } from "@/lib/escale/exportar/baixar";

const envolver = (qc: QueryClient) =>
  function Envolto({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
const novoQc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const dados = (status: string) => ({ campanha: { status } }) as unknown as DadosDoDetalhe;

afterEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
  vi.mocked(apiClient.patch).mockReset();
  vi.unstubAllGlobals();
});

describe("chave e reconsulta (N15)", () => {
  it("a chave mora debaixo da lista da 8A; reconsulta só enquanto anda", () => {
    expect(chaveDoDetalhe("c1")).toEqual(["campanhas-da-casca", "detalhe", "c1"]);
    expect(reconsultaDoDetalhe(undefined)).toBe(false);
    expect(reconsultaDoDetalhe(dados("running"))).toBe(10_000);
    expect(reconsultaDoDetalhe(dados("preparing"))).toBe(10_000);
    expect(reconsultaDoDetalhe(dados("completed"))).toBe(false);
  });
});

describe("as consultas", () => {
  it("o sumário pela rota do fork", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: dados("completed") });
    const { result } = renderHook(() => useDetalheDaCampanha("c1"), {
      wrapper: envolver(novoQc()),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/campanhas-da-casca/c1/sumario");
  });

  it("os destinatários com página, tamanho e filtro; desligado não consulta", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { linhas: [], total: 0, pagina: 2, porPagina: 20 },
    });
    const { result } = renderHook(
      () => useDestinatariosDaCampanha("c1", { busca: "Elza" }, 2, 20, true, false),
      { wrapper: envolver(novoQc()) },
    );
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(apiClient.get).toHaveBeenCalledWith(
      `/api/v1/campanhas-da-casca/c1/destinatarios?p=2&n=20&f=${encodeURIComponent('{"busca":"Elza"}')}`,
    );
    vi.mocked(apiClient.get).mockClear();
    renderHook(() => useDestinatariosDaCampanha("c1", {}, 1, 20, false, false), {
      wrapper: envolver(novoQc()),
    });
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});

describe("as mutações", () => {
  it("a massa invalida tudo da lista; o ritmo vai pelo PATCH do original", async () => {
    const qc = novoQc();
    const invalidar = vi.spyOn(qc, "invalidateQueries");
    vi.mocked(apiClient.post).mockResolvedValue({ data: { tipo: "campanha", id: "novo" } });
    const massa = renderHook(() => useMassaDaCampanha("c1"), { wrapper: envolver(qc) });
    let resposta: unknown;
    await act(async () => {
      resposta = await massa.result.current.mutateAsync({
        acao: "nova_campanha",
        alvo: { tipo: "filtro", excluidos: [] },
      });
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/campanhas-da-casca/c1/massa", {
      acao: "nova_campanha",
      alvo: { tipo: "filtro", excluidos: [] },
    });
    expect(resposta).toEqual({ tipo: "campanha", id: "novo" });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ["campanhas-da-casca"] });

    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    const ritmo = renderHook(() => useRitmoDaCampanha("c1"), { wrapper: envolver(qc) });
    const corpo = {
      intervalo_segundos: 30,
      teto_diario: null,
      teto_horario: null,
      janela_inicio_hora: null,
      janela_fim_hora: null,
    };
    await act(async () => {
      await ritmo.result.current.mutateAsync(corpo);
    });
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/campaigns/c1", corpo);
  });
});

describe("baixarCsvDaCampanha", () => {
  it("baixa o texto da rota com o nome do arquivo; falha vira erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, text: async () => "a,b" })),
    );
    await baixarCsvDaCampanha("c1", "10.09", "America/Sao_Paulo");
    expect(fetch).toHaveBeenCalledWith("/api/v1/campanhas-da-casca/c1/csv", {
      credentials: "same-origin",
    });
    expect(baixarCsv).toHaveBeenCalledWith(
      expect.stringMatching(/^campanha-10-09-\d{4}-\d{2}-\d{2}\.csv$/),
      "a,b",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, text: async () => "" })),
    );
    await expect(baixarCsvDaCampanha("c1", "10.09")).rejects.toThrow(
      "Não foi possível baixar o arquivo. Tente novamente.",
    );
  });
});
