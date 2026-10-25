import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useMensagensEmCache } from "@/hooks/inbox/useMessagesRealtime";
import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";
import { apiClient } from "@/lib/api/client";

vi.mock("@/hooks/realtime/useRealtimeChannel", () => ({
  useRealtimeChannel: vi.fn(() => ({ status: "SUBSCRIBED", ultimaEntrega: 0 })),
}));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn() } }));

describe("useMensagensEmCache (G1-1)", () => {
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
