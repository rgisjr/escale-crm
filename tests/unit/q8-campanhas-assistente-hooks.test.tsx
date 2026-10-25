import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));

import { useAssistenteSalvo } from "@/hooks/escale/useAssistenteDeCampanha";
import { apiClient } from "@/lib/api/client";
import { estadoInicial, redutorDoAssistente } from "@/lib/escale/campanhas/estado-do-assistente";

beforeEach(() => vi.clearAllMocks());

describe("useAssistenteSalvo (B8-3)", () => {
  it("reabrir o mesmo rascunho busca de novo no servidor, não serve o cache antigo", async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { campanhaId: "c1", status: "ready" } } as never)
      .mockResolvedValueOnce({ data: { campanhaId: "c1", status: "draft" } } as never);
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const primeira = renderHook(() => useAssistenteSalvo("c1"), { wrapper });
    await waitFor(() => expect(primeira.result.current.data).toBeDefined());
    primeira.unmount();
    await new Promise((r) => setTimeout(r, 10)); // o coletor de cache roda com gcTime 0
    const segunda = renderHook(() => useAssistenteSalvo("c1"), { wrapper });
    await waitFor(() => expect(segunda.result.current.data?.status).toBe("draft"));
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });
});

describe("a importação do .csv no estado do assistente (B8-6)", () => {
  it("sobrevive à troca de passo e some ao carregar outro rascunho", () => {
    let e = redutorDoAssistente(estadoInicial(), { tipo: "importacao", id: "imp-1" });
    e = redutorDoAssistente(e, { tipo: "irPara", passo: 2 });
    e = redutorDoAssistente(e, { tipo: "irPara", passo: 1 });
    expect(e.importacaoId).toBe("imp-1");
    e = redutorDoAssistente(e, {
      tipo: "carregar",
      campanhaId: "c1",
      dados: e.dados,
      publicoAntigo: false,
    });
    expect(e.importacaoId).toBeNull();
  });
});
