import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useGravarRoteamento } from "@/hooks/escale/useDispositivosDaCasca";
import { useMinhasPermissoes } from "@/hooks/escale/usePermissoesDeAtendimento";
import { useRespostasRapidas } from "@/hooks/escale/useRespostasRapidas";
import { useAlterarSetor, useSalvarSetor, useSetoresDasConversas } from "@/hooks/escale/useSetores";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  showApiError: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let qc: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);
const CV = "c0000000-0000-4000-8000-000000000001";

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  for (const m of ["get", "post", "patch", "put", "delete"] as const)
    vi.mocked(apiClient[m]).mockReset();
});

describe("setores", () => {
  it("salvar sem id cria, com id edita; invalida a lista", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: "s1" } });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: "s1" } });
    const inv = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useSalvarSetor(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ nome: "A", cor: "#000000", membros: [] });
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/setores", {
      nome: "A",
      cor: "#000000",
      membros: [],
    });
    await act(async () => {
      await result.current.mutateAsync({ id: "s1", nome: "B", cor: "#000000", membros: [] });
    });
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/setores/s1", {
      nome: "B",
      cor: "#000000",
      membros: [],
    });
    expect(inv).toHaveBeenCalledWith({ queryKey: ["setores"] });
  });
  it("setores das conversas com ids ordenados; vazio sem ids", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { b: { setor: null, em_transferencia: false, setor_anterior: null } },
    });
    const { result } = renderHook(() => useSetoresDasConversas(["b", "a"]), { wrapper });
    await waitFor(() => expect(Object.keys(result.current)).toEqual(["b"]));
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/setores/das-conversas?ids=a%2Cb");
    expect(renderHook(() => useSetoresDasConversas([]), { wrapper }).result.current).toEqual({});
  });
  it("alterar e cancelar o setor da conversa", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.delete).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAlterarSetor(CV), { wrapper });
    await act(async () => {
      await result.current.alterar.mutateAsync("s2");
    });
    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/conversas-da-casca/${CV}/setor`, {
      setor_id: "s2",
    });
    await act(async () => {
      await result.current.cancelar.mutateAsync();
    });
    expect(apiClient.delete).toHaveBeenCalledWith(`/api/v1/conversas-da-casca/${CV}/setor`);
  });
});

describe("permissões, respostas e roteamento", () => {
  it("as minhas permissões; a URL das respostas; o MFA do roteamento vira toast", async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) =>
      url.includes("permissoes-de-atendimento")
        ? { data: { CHAT_VIEW_TEAM: true } }
        : { data: [], meta: { total: 0, pagina: 2, por_pagina: 10 } },
    );
    const p = renderHook(() => useMinhasPermissoes(), { wrapper });
    await waitFor(() => expect(p.result.current.CHAT_VIEW_TEAM).toBe(true));
    const r = renderHook(
      () => useRespostasRapidas({ busca: "oi", setor: "pessoais", pagina: 2, por_pagina: 10 }),
      { wrapper },
    );
    await waitFor(() => expect(r.result.current.data?.meta.pagina).toBe(2));
    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/v1/respostas-rapidas?busca=oi&setor=pessoais&pagina=2&por_pagina=10",
    );
    vi.mocked(apiClient.patch).mockRejectedValue(
      Object.assign(new Error("x"), { status: 403, code: "mfa_required" }),
    );
    const g = renderHook(() => useGravarRoteamento(), { wrapper });
    await act(async () => {
      await g.result.current
        .mutateAsync({ channel_session_id: "c", user_ids: [] })
        .catch(() => undefined);
    });
    expect(toast.error).toHaveBeenCalledWith("Confirme a verificação em duas etapas.");
  });
});
