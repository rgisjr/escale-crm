import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

import { showApiError } from "@/components/feedback/ApiErrorToast";
import {
  CHAVE_DAS_AUTOMACOES,
  useAcoesDasAutomacoes,
  useAcoesDasPastas,
  useListaDeAutomacoes,
  useOrganizarAoCriar,
} from "@/hooks/escale/useAutomacoesDaCasca";
import { apiClient } from "@/lib/api/client";
import type { ListaDeAutomacoes } from "@/lib/escale/automacoes/tipos";
import { toast } from "sonner";

const LISTA: ListaDeAutomacoes = {
  automacoes: [
    { id: "r1", nome: "A", ativa: true, atualizadaEm: "2026-10-01T00:00:00Z", pastaId: null, forma: null, favorita: false, agentes: [] },
  ],
  pastas: [],
  agentes: [],
};

const novoQc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const envolver = (qc: QueryClient) =>
  function Envolto({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockResolvedValue({ data: LISTA });
});

describe("lista", () => {
  it("lê GET /api/v1/automacoes-da-casca", async () => {
    const { result } = renderHook(() => useListaDeAutomacoes(), { wrapper: envolver(novoQc()) });
    await waitFor(() => expect(result.current.data).toEqual(LISTA));
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/automacoes-da-casca");
  });

  it("invalidar o prefixo do original recarrega a lista da casca", async () => {
    const qc = novoQc();
    const { result } = renderHook(() => useListaDeAutomacoes(), { wrapper: envolver(qc) });
    await waitFor(() => expect(result.current.data).toBeDefined());
    await act(() => qc.invalidateQueries({ queryKey: ["automation-rules"] }));
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });
});

describe("automações", () => {
  it("alternar muda a linha antes da resposta e desfaz se falhar", async () => {
    const qc = novoQc();
    qc.setQueryData(CHAVE_DAS_AUTOMACOES, LISTA);
    let rejeitar: (e: Error) => void = () => {};
    vi.mocked(apiClient.patch).mockReturnValue(new Promise((_, rej) => (rejeitar = rej)) as never);
    const { result } = renderHook(() => useAcoesDasAutomacoes(), { wrapper: envolver(qc) });
    act(() => result.current.alternar.mutate({ id: "r1", ativa: false }));
    await waitFor(() => expect(qc.getQueryData<ListaDeAutomacoes>(CHAVE_DAS_AUTOMACOES)?.automacoes[0]?.ativa).toBe(false));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/automation-rules/r1", { is_active: false });
    await act(async () => rejeitar(new Error("x")));
    await waitFor(() => expect(showApiError).toHaveBeenCalled());
    expect(qc.getQueryData<ListaDeAutomacoes>(CHAVE_DAS_AUTOMACOES)?.automacoes[0]?.ativa).toBe(true);
  });

  it("alternar com sucesso mostra o toast do original", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({});
    const { result } = renderHook(() => useAcoesDasAutomacoes(), { wrapper: envolver(novoQc()) });
    await act(() => result.current.alternar.mutateAsync({ id: "r1", ativa: true }));
    expect(toast.success).toHaveBeenCalledWith("Automação ligada.");
  });

  it("favoritar é otimista", async () => {
    const qc = novoQc();
    qc.setQueryData(CHAVE_DAS_AUTOMACOES, LISTA);
    vi.mocked(apiClient.put).mockResolvedValue({});
    const { result } = renderHook(() => useAcoesDasAutomacoes(), { wrapper: envolver(qc) });
    await act(() => result.current.favoritar.mutateAsync({ id: "r1", favorita: true }));
    expect(apiClient.put).toHaveBeenCalledWith("/api/v1/automacoes-da-casca/r1/favorita", { favorita: true });
  });

  it("as demais ações chamam a URL e o método certos", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({});
    vi.mocked(apiClient.delete).mockResolvedValue({});
    vi.mocked(apiClient.put).mockResolvedValue({});
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: "r2", movidas: [], falhas: [], excluidas: [] } });
    const { result } = renderHook(() => useAcoesDasAutomacoes(), { wrapper: envolver(novoQc()) });
    await act(async () => {
      await result.current.renomear.mutateAsync({ id: "r1", nome: "Novo" });
      await result.current.excluir.mutateAsync("r1");
      await result.current.duplicar.mutateAsync("r1");
      await result.current.organizar.mutateAsync({ id: "r1", pasta_id: "p1", forma: "editor" });
      await result.current.moverEmLote.mutateAsync({ ids: ["r1"], pasta_id: null });
      await result.current.excluirEmLote.mutateAsync(["r1"]);
    });
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/automation-rules/r1", { name: "Novo" });
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/automation-rules/r1");
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/automacoes-da-casca/r1/duplicar", {});
    expect(apiClient.put).toHaveBeenCalledWith("/api/v1/automacoes-da-casca/r1/organizacao", { pasta_id: "p1", forma: "editor" });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/automacoes-da-casca/mover", { ids: ["r1"], pasta_id: null });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/automacoes-da-casca/excluir", { ids: ["r1"] });
  });
});

describe("pastas", () => {
  it("criar, editar e excluir", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: "p1" } });
    vi.mocked(apiClient.patch).mockResolvedValue({});
    vi.mocked(apiClient.delete).mockResolvedValue({});
    const { result } = renderHook(() => useAcoesDasPastas(), { wrapper: envolver(novoQc()) });
    await act(async () => {
      await result.current.criar.mutateAsync({ nome: "Vendas" });
      await result.current.editar.mutateAsync({ id: "p1", cor: "red" });
      await result.current.excluir.mutateAsync("p1");
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/automacoes-da-casca/pastas", { nome: "Vendas" });
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/automacoes-da-casca/pastas/p1", { cor: "red" });
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/automacoes-da-casca/pastas/p1");
  });
});

describe("useOrganizarAoCriar", () => {
  it("grava a organização", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({});
    const { result } = renderHook(() => useOrganizarAoCriar(), { wrapper: envolver(novoQc()) });
    await act(() => result.current("r9", { pasta_id: "p1", forma: "editor" }));
    expect(apiClient.put).toHaveBeenCalledWith("/api/v1/automacoes-da-casca/r9/organizacao", { pasta_id: "p1", forma: "editor" });
  });

  it("falhando, avisa e não lança", async () => {
    vi.mocked(apiClient.put).mockRejectedValue(new Error("x"));
    const { result } = renderHook(() => useOrganizarAoCriar(), { wrapper: envolver(novoQc()) });
    await act(() => result.current("r9", { pasta_id: null, forma: "fluxo" }));
    expect(toast.error).toHaveBeenCalledWith("A automação foi criada, mas não foi possível colocá-la na pasta.");
  });
});
