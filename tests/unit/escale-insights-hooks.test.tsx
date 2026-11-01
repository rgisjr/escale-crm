import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/lib/escale/exportar/baixar", () => ({ baixarCsv: vi.fn() }));
vi.mock("@/app/app/webhooks/_components/ActivityTab", () => ({
  explicacaoDe: (r: { error?: string }) => (r.error ? `motivo ${r.error}` : null),
}));

import {
  CHAVE_DOS_INSIGHTS,
  exportarExecucoesEmCsv,
  queryDasExecucoes,
  useExecucoesDaAutomacao,
  useResumoDaAutomacao,
} from "@/hooks/escale/useInsightsDaAutomacao";
import { apiClient } from "@/lib/api/client";
import { baixarCsv } from "@/lib/escale/exportar/baixar";
import type { FiltroDasExecucoes } from "@/lib/escale/automacoes/insights/tipos";

const RESUMO = { total: 3, sucesso: 2, parcial: 0, falhou: 1, adiado: 0, ultima: null, passos: [] };
const novoQc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const envolver = (qc: QueryClient) =>
  function Envolto({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };

const PAINEL: FiltroDasExecucoes = { origem: "painel", situacoes: ["success"] };
const PASSO: FiltroDasExecucoes = {
  origem: "passo",
  acoes: [
    { indice: 1, tipo: "call_webhook" },
    { indice: 2, tipo: "add_tag" },
  ],
  tipoDoCartao: "grupo_de_acoes",
  resultados: ["erro"],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockResolvedValue({ data: RESUMO });
});

describe("useResumoDaAutomacao", () => {
  it("sem id não pede nada", () => {
    renderHook(() => useResumoDaAutomacao(null, "30d"), { wrapper: envolver(novoQc()) });
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("com id pede o período e a chave leva o prefixo do original", async () => {
    const qc = novoQc();
    const { result } = renderHook(() => useResumoDaAutomacao("r1", "30d"), { wrapper: envolver(qc) });
    await waitFor(() => expect(result.current.data).toEqual(RESUMO));
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/automacoes-da-casca/r1/insights?periodo=30d");
    expect(CHAVE_DOS_INSIGHTS.slice(0, 1)).toEqual(["automation-rule-runs"]);
    expect(qc.getQueryCache().getAll()[0]!.queryKey.slice(0, 2)).toEqual([...CHAVE_DOS_INSIGHTS]);
  });

  it("invalidar o prefixo do 'Reenviar' recarrega (a prova de que o Reenviar atualiza)", async () => {
    const qc = novoQc();
    const { result } = renderHook(() => useResumoDaAutomacao("r1", "7d"), { wrapper: envolver(qc) });
    await waitFor(() => expect(result.current.data).toBeDefined());
    await act(() => qc.invalidateQueries({ queryKey: ["automation-rule-runs"] }));
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });
});

describe("queryDasExecucoes", () => {
  it("painel: situações; passo: passos e resultados; condições: só período e busca", () => {
    expect(queryDasExecucoes("30d", PAINEL, ["success", "failed"], "", 2)).toBe("periodo=30d&situacoes=success%2Cfailed&pagina=2");
    expect(queryDasExecucoes("tudo", PASSO, ["erro"], " ana ", 1)).toBe(
      "periodo=tudo&passos=1%3Acall_webhook%2C2%3Aadd_tag&resultados=erro&busca=ana&pagina=1",
    );
    expect(queryDasExecucoes("7d", { origem: "condicoes" }, [], "", undefined)).toBe("periodo=7d");
  });
});

describe("useExecucoesDaAutomacao", () => {
  it("pede a listagem com a query montada", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { total: 0, linhas: [] } });
    const { result } = renderHook(() => useExecucoesDaAutomacao("r1", "30d", PAINEL, ["success"], "", 1), {
      wrapper: envolver(novoQc()),
    });
    await waitFor(() => expect(result.current.data).toEqual({ total: 0, linhas: [] }));
    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/v1/automacoes-da-casca/r1/execucoes?periodo=30d&situacoes=success&pagina=1",
    );
  });
});

describe("exportarExecucoesEmCsv", () => {
  it("monta o CSV com o motivo e baixa com o nome do arquivo", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        nome: "Boas-vindas",
        acoes: [{ type: "call_webhook" }],
        linhas: [
          {
            id: "x",
            status: "failed",
            criadaEm: "2026-09-10T15:40:00Z",
            eventoId: null,
            resultados: [{ type: "call_webhook", status: "failed", error: "http_500" }],
            contato: null,
            negocio: null,
          },
        ],
      },
    });
    await exportarExecucoesEmCsv("r1", "periodo=30d", "America/Sao_Paulo", (s) => s);
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/automacoes-da-casca/r1/execucoes/exportar?periodo=30d");
    const [nome, csv] = vi.mocked(baixarCsv).mock.calls[0]!;
    expect(nome).toMatch(/^execucoes-boas-vindas-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csv).toContain("10/09/2026 12:40,,,,,Falhou,1. Avisar outro sistema (webhook),motivo http_500");
  });

  it("o erro da rota (teto) sobe com a mensagem e nada é baixado", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error("A lista tem mais de 5.000 execuções."));
    await expect(exportarExecucoesEmCsv("r1", "", "America/Sao_Paulo", (s) => s)).rejects.toThrow("mais de 5.000");
    expect(baixarCsv).not.toHaveBeenCalled();
  });
});
