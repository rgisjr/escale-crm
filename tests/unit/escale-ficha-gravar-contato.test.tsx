import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const atualizar = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => ({ data: {} })) }));
vi.mock("@/hooks/contacts/useUpdateContact", () => ({
  useUpdateContact: () => ({ mutateAsync: atualizar.mutateAsync }),
}));

import { useGravarContato } from "@/hooks/escale/useGravarContato";

/** FORK ESCALE · Fase 1H (N4): gravar o contato invalida o quadro, que é de onde a ficha lê. */
describe("useGravarContato", () => {
  it("manda o patch e invalida o quadro da origem e a linha do tempo", async () => {
    const qc = new QueryClient();
    const invalidar = vi.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useGravarContato("c1", "o1"), { wrapper });
    await result.current.gravar({ name: "Ana" });
    expect(atualizar.mutateAsync).toHaveBeenCalledWith({ name: "Ana" });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ["board", "o1"] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ["timeline"] });
  });
});
