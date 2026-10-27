import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const showApiError = vi.fn();
vi.mock("@/components/feedback/ApiErrorToast", () => ({
  showApiError: (...args: unknown[]) => showApiError(...args),
}));

const { avisarSoNaPrimeiraCarga } = await import("@/lib/query/avisar-so-na-primeira-carga");

beforeEach(() => showApiError.mockClear());

describe("avisarSoNaPrimeiraCarga", () => {
  it("sem dado em cache (primeira carga) avisa", () => {
    const qc = new QueryClient();
    const erro = new Error("falhou");
    avisarSoNaPrimeiraCarga(qc, ["fila", 1], erro);
    expect(showApiError).toHaveBeenCalledWith(erro);
  });

  it("com dado em cache (refetch automático) fica em silêncio", () => {
    const qc = new QueryClient();
    qc.setQueryData(["fila", 1], { itens: [] });
    avisarSoNaPrimeiraCarga(qc, ["fila", 1], new Error("falhou"));
    expect(showApiError).not.toHaveBeenCalled();
  });

  it("dado de OUTRA chave não silencia", () => {
    const qc = new QueryClient();
    qc.setQueryData(["fila", 2], { itens: [] });
    avisarSoNaPrimeiraCarga(qc, ["fila", 1], new Error("falhou"));
    expect(showApiError).toHaveBeenCalledTimes(1);
  });
});
