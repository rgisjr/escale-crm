import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { useAcoesDosPaineis } from "@/hooks/escale/usePaineisDaCasca";
import { useCatalogoDeIndicadores } from "@/hooks/escale/useCatalogoDeIndicadores";
import { chaveDosGraficos } from "@/hooks/escale/useGraficosDoPainel";
import { useOpcoesDaDimensao } from "@/hooks/escale/useOpcoesDaDimensao";
import { useRascunhoDoGrafico } from "@/hooks/escale/useRascunhoDoGrafico";
import { useSalvarGrafico } from "@/hooks/escale/useSalvarGrafico";
import { apiClient } from "@/lib/api/client";
import { adicionarIndicador, adicionarVariavel, rascunhoNovo } from "@/lib/escale/indicadores/editor/rascunho";
import { CATALOGO_FALSO as CAT } from "@/tests/helpers/catalogo-da-tela";

const BASE = "/api/v1/indicadores-da-casca";
const novoQc = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const envolver = (qc: QueryClient) =>
  function Envolto({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };

beforeEach(() => vi.clearAllMocks());

describe("catálogo e opções", () => {
  it("o catálogo chama o GET uma vez", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: CAT });
    const qc = novoQc();
    const a = renderHook(() => useCatalogoDeIndicadores(), { wrapper: envolver(qc) });
    renderHook(() => useCatalogoDeIndicadores(), { wrapper: envolver(qc) });
    await waitFor(() => expect(a.result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(apiClient.get).toHaveBeenCalledWith(`${BASE}/catalogo`);
  });

  it("as opções só consultam ligadas", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { opcoes: [{ valor: "e1", rotulo: "Novo" }] } });
    const { result, rerender } = renderHook(({ ligado }) => useOpcoesDaDimensao("negocio.etapa", ligado), {
      wrapper: envolver(novoQc()),
      initialProps: { ligado: false },
    });
    expect(apiClient.get).not.toHaveBeenCalled();
    rerender({ ligado: true });
    await waitFor(() => expect(result.current.data).toEqual([{ valor: "e1", rotulo: "Novo" }]));
    expect(apiClient.get).toHaveBeenCalledWith(`${BASE}/opcoes?dimensao=negocio.etapa`);
  });
});

describe("useRascunhoDoGrafico", () => {
  const pronto = () => adicionarIndicador(rascunhoNovo(), "negocio.quantidade", CAT);

  it("executar sem indicador devolve false e guarda o erro; mexer na seção limpa o erro", () => {
    const { result } = renderHook(() => useRascunhoDoGrafico(rascunhoNovo(), CAT));
    let ok = true;
    act(() => {
      ok = result.current.executar();
    });
    expect(ok).toBe(false);
    expect(result.current.erros).toEqual([{ secao: "indicador" }]);
    act(() => result.current.mudar((r) => adicionarIndicador(r, "negocio.quantidade", CAT)));
    expect(result.current.erros).toEqual([]);
  });

  it("com indicador grava a foto e a rodada 0; o 2º executar sobe a rodada", () => {
    const { result } = renderHook(() => useRascunhoDoGrafico(pronto(), CAT));
    act(() => void result.current.executar());
    expect(result.current.foto?.indicadores).toEqual(["negocio.quantidade"]);
    expect(result.current.rodada).toBe(0);
    act(() => void result.current.executar());
    expect(result.current.rodada).toBe(1);
  });

  it("mexer na consulta deixa pendente; mexer só no desenho não", () => {
    const { result } = renderHook(() => useRascunhoDoGrafico(pronto(), CAT));
    act(() => void result.current.executar());
    expect(result.current.pendente).toBe(false);
    act(() => result.current.mudar((r) => ({ ...r, opcoes: { ...r.opcoes, visualizacao: { ...r.opcoes.visualizacao, grade: false } } })));
    expect(result.current.pendente).toBe(false);
    act(() => result.current.mudar((r) => adicionarVariavel(r, "negocio.origem")));
    expect(result.current.pendente).toBe(true);
  });
});

describe("useSalvarGrafico e painel com nome", () => {
  it("criar faz POST e invalida o painel", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: "g1" } });
    const qc = novoQc();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useSalvarGrafico(), { wrapper: envolver(qc) });
    await act(async () => {
      await result.current.criar.mutateAsync({ painelId: "p1", nome: "N", tipo: "barra", pergunta: {}, opcoes: {} });
    });
    expect(apiClient.post).toHaveBeenCalledWith(`${BASE}/graficos`, expect.objectContaining({ painelId: "p1" }));
    expect(spy).toHaveBeenCalledWith({ queryKey: chaveDosGraficos("p1") });
  });

  it("atualizar com painel novo invalida os dois e não manda o painel de origem", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: "g1" } });
    const qc = novoQc();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useSalvarGrafico(), { wrapper: envolver(qc) });
    await act(async () => {
      await result.current.atualizar.mutateAsync({ id: "g1", painelDeOrigem: "p1", painelId: "p2", nome: "X" });
    });
    expect(apiClient.patch).toHaveBeenCalledWith(`${BASE}/graficos/g1`, { painelId: "p2", nome: "X" });
    expect(spy).toHaveBeenCalledWith({ queryKey: chaveDosGraficos("p1") });
    expect(spy).toHaveBeenCalledWith({ queryKey: chaveDosGraficos("p2") });
  });

  it("criar painel com nome manda o nome; sem nome manda corpo vazio", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: "novo" } });
    const { result } = renderHook(() => useAcoesDosPaineis(), { wrapper: envolver(novoQc()) });
    await act(async () => {
      await result.current.criar.mutateAsync({ nome: "Time SDR" });
      await result.current.criar.mutateAsync(undefined);
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(1, `${BASE}/paineis`, { nome: "Time SDR" });
    expect(apiClient.post).toHaveBeenNthCalledWith(2, `${BASE}/paineis`, {});
  });
});
