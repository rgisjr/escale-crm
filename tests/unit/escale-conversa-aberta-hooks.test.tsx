import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useContagemDeAgendadas,
  useMensagensAgendadas,
} from "@/hooks/escale/useMensagensAgendadas";
import { useModelosDeMensagem } from "@/hooks/escale/useModelosDeMensagem";
import { useConversaDaCasca } from "@/hooks/escale/useConversaDaCasca";
import { apiClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  showApiError: vi.fn(),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "u1" }, activeOrg: { orgId: "o1", role: "agent" } }),
}));

const CV = "c0000000-0000-4000-8000-000000000001";
let qc: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
  vi.mocked(apiClient.delete).mockReset();
  window.localStorage.clear();
});

describe("useConversaDaCasca", () => {
  it("lê eventos e pausa; a espera chama a rota e invalida a conversa e os eventos", async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url.endsWith("/eventos"))
        return { data: [{ id: "e1", tipo: "espera", em: "2026-10-18T10:00:00Z", user_id: "u1" }] };
      if (url.endsWith("/pausa"))
        return {
          data: { pausa: null, agenteAtivo: true, followups: { ativos: 0, proximoEm: null } },
        };
      throw new Error(`GET inesperado ${url}`);
    });
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { snooze_until: "9999-12-31T00:00:00.000Z" },
    });
    const invalidar = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useConversaDaCasca(CV), { wrapper });
    await waitFor(() => expect(result.current.eventos).toHaveLength(1));
    await waitFor(() => expect(result.current.pausa?.agenteAtivo).toBe(true));
    await act(async () => {
      await result.current.entrarEmEspera.mutateAsync();
    });
    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/conversas-da-casca/${CV}/espera`, {});
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ["conversations"] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ["eventos-da-conversa", CV] });
  });
});

describe("useMensagensAgendadas / contagem", () => {
  it("monta a URL com os filtros e lê a contagem com os ids ordenados", async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url.startsWith("/api/v1/mensagens-agendadas/contagem")) return { data: { b: 2 } };
      return { data: [], meta: { total: 0, pagina: 2, por_pagina: 25 } };
    });
    const { result } = renderHook(
      () =>
        useMensagensAgendadas({ busca: "ana", pagina: 2, por_pagina: 25, envio_de: "2026-10-01" }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.data?.meta.pagina).toBe(2));
    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/v1/mensagens-agendadas?busca=ana&envio_de=2026-10-01&pagina=2&por_pagina=25",
    );
    const c = renderHook(() => useContagemDeAgendadas(["b", "a"]), { wrapper });
    await waitFor(() => expect(c.result.current).toEqual({ b: 2 }));
    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/v1/mensagens-agendadas/contagem?conversation_ids=a%2Cb",
    );
    const vazio = renderHook(() => useContagemDeAgendadas([]), { wrapper });
    expect(vazio.result.current).toEqual({});
  });
});

describe("useModelosDeMensagem", () => {
  it("sem fonte não busca; com Meta Cloud lê a rota dos modelos e guarda os recentes", async () => {
    const sem = renderHook(() => useModelosDeMensagem("evolution"), { wrapper });
    expect(sem.result.current.fonte).toBeNull();
    expect(apiClient.get).not.toHaveBeenCalled();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { templates: [{ name: "oi", language: "pt_BR", status: "APPROVED" }] },
    });
    const { result } = renderHook(() => useModelosDeMensagem("meta_cloud"), { wrapper });
    await waitFor(() => expect(result.current.modelos).toHaveLength(1));
    act(() => result.current.marcarUsado("oi"));
    expect(result.current.recentes).toEqual(["oi"]);
    expect(JSON.parse(window.localStorage.getItem("escale_modelos_recentes:o1") ?? "[]")).toEqual([
      "oi",
    ]);
  });
});
