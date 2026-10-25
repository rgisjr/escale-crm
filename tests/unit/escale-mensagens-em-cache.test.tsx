import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMensagensEmCache, useMessagesRealtime } from "@/hooks/inbox/useMessagesRealtime";
import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";
import { apiClient } from "@/lib/api/client";

vi.mock("@/hooks/realtime/useRealtimeChannel", () => ({
  useRealtimeChannel: vi.fn(() => ({ status: "SUBSCRIBED", ultimaEntrega: 0 })),
}));
vi.mock("@/hooks/realtime/useRefetchDeSeguranca", () => ({
  useRefetchDeSeguranca: vi.fn(() => ({})),
}));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn() } }));

describe("useMensagensEmCache (G1-1)", () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * A thread e o compositor dividem a chave ["messages", id]. Quem monta por
   * último deixa a SUA função de busca na query; a recarga sem observador
   * (tempo real, rede de segurança) usa essa. Com uma função vazia no leitor
   * do cache, a conversa zerava: as mensagens apareciam e sumiam.
   */
  it("a recarga com a thread e o compositor montados não zera as mensagens", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ id: "m1", sent_at: "2026-10-25T15:41:00Z" }],
      meta: { has_more: false, cursor: null },
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => ({ thread: useMessagesRealtime("c1"), compositor: useMensagensEmCache("c1") }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.thread.data?.pages[0]?.data).toHaveLength(1));

    await qc.refetchQueries({ queryKey: ["messages", "c1"], exact: true });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
    expect(result.current.thread.data?.pages[0]?.data).toHaveLength(1);
    expect(result.current.compositor.data?.pages[0]?.data).toHaveLength(1);
  });

  it("lê o cache da thread sem abrir canal de tempo real nem buscar", () => {
    const qc = new QueryClient();
    qc.setQueryData(["messages", "c1"], {
      pages: [{ data: [{ id: "m1", type: "template" }] }],
      pageParams: [undefined],
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useMensagensEmCache("c1"), { wrapper });
    expect(result.current.data?.pages[0]?.data[0]?.id).toBe("m1");
    expect(useRealtimeChannel).not.toHaveBeenCalled();
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
