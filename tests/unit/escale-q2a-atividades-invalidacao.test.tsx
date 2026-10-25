import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u-eu" }),
  usePermission: () => true,
}));
vi.mock("@/hooks/kanban/useUpdateLead", () => ({
  useEditLead: () => ({ mutateAsync: vi.fn(async () => undefined) }),
}));

import { useAtividadesDoNegocio } from "@/hooks/escale/useAtividadesDoNegocio";
import { apiClient } from "@/lib/api/client";
import type { Lead } from "@/lib/types/leads";

/** Q2a (B2-3, B2-4, G2-1, G9-3): a atividade invalida só o quadro do funil, sem esperar, e o autosave vai em fila. */
const LEAD = { id: "n1", pipeline_id: "p1", owner_user_id: "u-eu", owner_agent_id: null } as Lead;

function montar() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidar = vi.spyOn(qc, "invalidateQueries");
  const envolver = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useAtividadesDoNegocio(LEAD), { wrapper: envolver }), invalidar };
}

const chavesInvalidadas = (invalidar: ReturnType<typeof montar>["invalidar"]) =>
  invalidar.mock.calls.map(([f]) => (f as { queryKey: unknown[] }).queryKey);

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
  vi.mocked(apiClient.get).mockResolvedValue({ data: { atividades: [], modelos: [] } });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
});

describe("useAtividadesDoNegocio: invalidação do quadro", () => {
  it("concluir invalida só o quadro do funil, nunca o ['board'] inteiro", async () => {
    const { result, invalidar } = montar();
    await act(async () => {
      await result.current.alternar({ id: "t1", status: "pending" });
    });
    const chaves = chavesInvalidadas(invalidar);
    expect(chaves).toContainEqual(["board", "p1"]);
    expect(chaves).not.toContainEqual(["board"]);
  });

  it("o mutateAsync não espera o refetch do quadro", async () => {
    const { result, invalidar } = montar();
    invalidar.mockImplementation(() => new Promise<void>(() => undefined));
    let terminou = false;
    await act(async () => {
      await result.current.editar("t1", { status: "done" });
      terminou = true;
    });
    expect(terminou).toBe(true);
  });

  it("editar só o conteúdo não invalida o quadro (o selo do card não muda)", async () => {
    const { result, invalidar } = montar();
    await act(async () => {
      await result.current.editar("t1", { description: "oi" });
    });
    expect(chavesInvalidadas(invalidar).some((k) => k[0] === "board")).toBe(false);
  });

  it("gravações do conteúdo saem em fila: a segunda só parte depois da primeira", async () => {
    const { result } = montar();
    const soltar: Array<() => void> = [];
    vi.mocked(apiClient.patch).mockImplementation(
      () => new Promise((resolver) => soltar.push(() => resolver({ data: {} }))),
    );
    let fim: Promise<unknown> = Promise.resolve();
    act(() => {
      void result.current.editar("t1", { description: "a" });
      fim = result.current.editar("t1", { description: "ab" });
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(apiClient.patch).toHaveBeenCalledTimes(1);
    await act(async () => {
      soltar[0]!();
      await vi.waitFor(() => expect(apiClient.patch).toHaveBeenCalledTimes(2));
      soltar[1]!();
      await fim;
    });
    expect(vi.mocked(apiClient.patch).mock.calls[1]![1]).toEqual({ description: "ab" });
  });
});
