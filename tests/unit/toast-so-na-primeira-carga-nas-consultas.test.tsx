import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Atualização automática que falha fica em SILÊNCIO (o TanStack mantém o dado
 * anterior na tela); o toast só sai quando a consulta ainda não tem nada para
 * mostrar. Medido em 26/10/2026: com o banco travando, o aviso aparecia sem a
 * pessoa ter feito nada.
 */

const showApiError = vi.fn();
const get = vi.fn();

vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: (e: unknown) => showApiError(e) }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: (...a: unknown[]) => get(...a) } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ usePermission: () => true }));
vi.mock("@/hooks/realtime/useRealtimeChannel", () => ({ useRealtimeChannel: () => {} }));

const { useConversationNotes } = await import("@/hooks/inbox/useConversationNotes");

function envolver() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

beforeEach(() => {
  showApiError.mockClear();
  get.mockReset();
});

describe("toast das consultas", () => {
  it("primeira carga com erro AVISA", async () => {
    get.mockRejectedValue(new Error("travou"));
    const { wrapper } = envolver();
    renderHook(() => useConversationNotes("c-1"), { wrapper });
    await waitFor(() => expect(showApiError).toHaveBeenCalledTimes(1));
  });

  it("refetch que falha com dado já na tela fica em silêncio", async () => {
    get.mockResolvedValueOnce({ data: [{ id: "n1" }] });
    const { qc, wrapper } = envolver();
    const { result } = renderHook(() => useConversationNotes("c-1"), { wrapper });
    await waitFor(() => expect(result.current).toHaveLength(1));

    get.mockRejectedValue(new Error("travou"));
    await qc.invalidateQueries({ queryKey: ["notes", "c-1"] });

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(showApiError).not.toHaveBeenCalled();
    expect(result.current).toHaveLength(1);
  });
});
