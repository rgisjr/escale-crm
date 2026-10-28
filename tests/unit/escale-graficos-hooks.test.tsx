import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { useApareceuNaTela } from "@/hooks/escale/useApareceuNaTela";
import { chaveDosGraficos, useAcoesDosGraficos, useGraficosDoPainel } from "@/hooks/escale/useGraficosDoPainel";
import { usePreferenciasDoPainel } from "@/hooks/escale/usePreferenciasDoPainel";
import { useResultadoDoGrafico } from "@/hooks/escale/useResultadoDoGrafico";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import { FILTRO_PADRAO } from "@/lib/escale/indicadores/painel/filtro";
import { _zerarFila } from "@/lib/escale/indicadores/painel/fila-do-navegador";
import type { Pergunta } from "@/lib/escale/indicadores/pergunta";

const BASE = "/api/v1/indicadores-da-casca";
const novoQc = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const envolver = (qc: QueryClient) =>
  function Envolto({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
const grafico = (id: string, x = 0) => ({
  id,
  nome: id,
  descricao: null,
  tipo: "barra",
  layout: { x, y: 0, w: 6, h: 4 },
  pergunta: {},
  opcoes: {},
});

beforeEach(() => {
  vi.clearAllMocks();
  _zerarFila();
  window.localStorage.clear();
});

describe("useGraficosDoPainel e ações", () => {
  it("devolve data.graficos", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { graficos: [grafico("g1")] } });
    const { result } = renderHook(() => useGraficosDoPainel("p1"), { wrapper: envolver(novoQc()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith(`${BASE}/paineis/p1/graficos`);
    expect(result.current.data?.[0]?.id).toBe("g1");
  });

  it("salvarLayout grava no cache antes da resposta e volta no erro", async () => {
    const qc = novoQc();
    qc.setQueryData(chaveDosGraficos("p1"), [grafico("g1")]);
    let falhar!: (e: unknown) => void;
    vi.mocked(apiClient.patch).mockReturnValue(new Promise((_, rej) => (falhar = rej)) as never);
    const { result } = renderHook(() => useAcoesDosGraficos("p1"), { wrapper: envolver(qc) });
    act(() => {
      result.current.salvarLayout.mutate([{ id: "g1", x: 6, y: 0, w: 6, h: 4 }]);
    });
    await waitFor(() => expect(qc.getQueryData<ReturnType<typeof grafico>[]>(chaveDosGraficos("p1"))?.[0]?.layout.x).toBe(6));
    await act(async () => {
      falhar(new ApiError(500, "internal_error", undefined, "r"));
    });
    await waitFor(() => expect(qc.getQueryData<ReturnType<typeof grafico>[]>(chaveDosGraficos("p1"))?.[0]?.layout.x).toBe(0));
    expect(showApiError).toHaveBeenCalled();
  });

  it("duplicar invalida e excluir tira do cache", async () => {
    const qc = novoQc();
    qc.setQueryData(chaveDosGraficos("p1"), [grafico("g1"), grafico("g2")]);
    const invalidar = vi.spyOn(qc, "invalidateQueries");
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: "g3" } });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { id: "g1" } });
    const { result } = renderHook(() => useAcoesDosGraficos("p1"), { wrapper: envolver(qc) });
    await act(async () => {
      await result.current.duplicar.mutateAsync("g1");
    });
    expect(apiClient.post).toHaveBeenCalledWith(`${BASE}/graficos/g1/duplicar`, {});
    expect(invalidar).toHaveBeenCalledWith({ queryKey: chaveDosGraficos("p1") });
    await act(async () => {
      await result.current.excluir.mutateAsync("g1");
    });
    expect(qc.getQueryData<ReturnType<typeof grafico>[]>(chaveDosGraficos("p1"))?.map((g) => g.id)).toEqual(["g2"]);
  });
});

describe("useApareceuNaTela", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("falso até o observador avisar; depois verdadeiro e desconecta", async () => {
    const disconnect = vi.fn();
    let aviso: (e: Array<{ isIntersecting: boolean }>) => void = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: typeof aviso) {
          aviso = cb;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
    const { result } = renderHook(() => useApareceuNaTela<HTMLDivElement>());
    act(() => result.current.ref(document.createElement("div")));
    expect(result.current.apareceu).toBe(false);
    act(() => aviso([{ isIntersecting: true }]));
    expect(result.current.apareceu).toBe(true);
    expect(disconnect).toHaveBeenCalled();
  });
  it("sem IntersectionObserver aparece já", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { result } = renderHook(() => useApareceuNaTela<HTMLDivElement>());
    expect(result.current.apareceu).toBe(true);
  });
});

describe("useResultadoDoGrafico", () => {
  const pergunta = { indicadores: ["negocio.ganhos"], variaveis: [], filtro: { modo: "todas", condicoes: [], grupos: [] }, limite: 1000 } as unknown as Pergunta;
  const base = { graficoId: "g1", pergunta, filtro: FILTRO_PADRAO, ligado: true, rodada: 0, intervaloMin: null } as const;

  it("desligado não chama a API", async () => {
    renderHook(() => useResultadoDoGrafico({ ...base, ligado: false }), { wrapper: envolver(novoQc()) });
    await new Promise((r) => setTimeout(r, 10));
    expect(apiClient.post).not.toHaveBeenCalled();
  });
  it("liga: manda o filtro do painel e só manda fresco depois do Atualizar", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { colunas: [], linhas: [] } });
    const qc = novoQc();
    const { result, rerender } = renderHook((p: { rodada: number }) => useResultadoDoGrafico({ ...base, rodada: p.rodada }), {
      wrapper: envolver(qc),
      initialProps: { rodada: 0 },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(apiClient.post).mock.calls[0]).toEqual([
      `${BASE}/consultar`,
      { pergunta: { ...pergunta }, filtroDoPainel: FILTRO_PADRAO },
    ]);
    rerender({ rodada: 1 });
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(2));
    expect(vi.mocked(apiClient.post).mock.calls[1]?.[1]).toMatchObject({ fresco: true });
  });
  it("429 tenta de novo e 500 não", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new ApiError(500, "internal_error", undefined, "r"));
    const um = renderHook(() => useResultadoDoGrafico(base), { wrapper: envolver(novoQc()) });
    await waitFor(() => expect(um.result.current.isError).toBe(true));
    expect(apiClient.post).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    vi.mocked(apiClient.post)
      .mockRejectedValueOnce(new ApiError(429, "fila_cheia", undefined, "r"))
      .mockResolvedValue({ data: { colunas: [], linhas: [] } });
    const dois = renderHook(() => useResultadoDoGrafico({ ...base, graficoId: "g2" }), { wrapper: envolver(novoQc()) });
    await waitFor(() => expect(dois.result.current.isSuccess).toBe(true), { timeout: 3000 });
    expect(apiClient.post).toHaveBeenCalledTimes(2);
  });
});

describe("usePreferenciasDoPainel", () => {
  it("começa no padrão, grava ao mudar e volta ao padrão", () => {
    const { result } = renderHook(() => usePreferenciasDoPainel("p1"));
    expect(result.current.filtro).toEqual(FILTRO_PADRAO);
    act(() => result.current.aplicarSalvo("s1", { usuarios: ["11111111-1111-4111-8111-111111111111"] }));
    expect(result.current.filtroSalvoId).toBe("s1");
    expect(window.localStorage.getItem("escale:indicadores:filtro:p1")).toContain("s1");
    const outro = renderHook(() => usePreferenciasDoPainel("p1"));
    expect(outro.result.current.filtroSalvoId).toBe("s1");
    act(() => result.current.aplicarPadrao());
    expect(result.current.filtro).toEqual(FILTRO_PADRAO);
    expect(result.current.filtroSalvoId).toBeNull();
    act(() => result.current.mudarIntervalo(15));
    expect(result.current.intervalo).toBe(15);
  });
});
