/**
 * useAvisosDaOrigem (fork Escale, Fase 1K, revisão 2): o leitor (viewer) não consulta a
 * rota de avisos, que exige agente ou acima — senão toda carga da casca vira 403 e uma
 * linha `authz.denied` na auditoria.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAvisosDaOrigem } from "@/hooks/escale/useAvisosDaOrigem";

const fakes = vi.hoisted(() => ({
  role: "agent" as string,
  get: vi.fn(async () => ({ data: [] })),
}));

vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org-dos-avisos", role: fakes.role }),
  useUser: () => ({ id: "user-1" }),
}));
vi.mock("@/hooks/realtime/useRealtimeChannel", () => ({ useRealtimeChannel: () => undefined }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: fakes.get } }));

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return renderHook(() => useAvisosDaOrigem(), { wrapper });
}

beforeEach(() => {
  fakes.get.mockClear();
});

describe("useAvisosDaOrigem — quem pergunta", () => {
  it("o leitor (viewer) não chama a rota", async () => {
    fakes.role = "viewer";
    renderizar();
    await new Promise((r) => setTimeout(r, 50));
    expect(fakes.get).not.toHaveBeenCalled();
  });

  it.each(["agent", "manager", "admin"])("%s chama a rota uma vez", async (role) => {
    fakes.role = role;
    renderizar();
    await waitFor(() => expect(fakes.get).toHaveBeenCalledTimes(1));
    expect(fakes.get).toHaveBeenCalledWith("/api/v1/escale/avisos-da-origem");
  });
});
