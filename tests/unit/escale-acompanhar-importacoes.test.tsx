import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const { toastFn, get } = vi.hoisted(() => ({
  toastFn: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  get: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: toastFn }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: (...a: unknown[]) => get(...a) } }));

import { AcompanharImportacoes, acompanharImportacao } from "@/components/escale/importacao/AcompanharImportacoes";

describe("aviso de fim das importações (Fase 2F)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it("avisa a revisão pendente e para de acompanhar", async () => {
    acompanharImportacao("imp-1");
    get.mockResolvedValue({ data: { id: "imp-1", status: "aguardando_revisao", revisar: 3 } });
    render(<AcompanharImportacoes />);
    await vi.advanceTimersByTimeAsync(5000);
    expect(toastFn).toHaveBeenCalledWith("3 linhas precisam de revisão", expect.anything());
    expect(window.sessionStorage.getItem("escale:importacoes")).toBe("[]");
  });

  it("em andamento, continua acompanhando", async () => {
    acompanharImportacao("imp-2");
    get.mockResolvedValue({ data: { id: "imp-2", status: "importando" } });
    render(<AcompanharImportacoes />);
    await vi.advanceTimersByTimeAsync(5000);
    expect(window.sessionStorage.getItem("escale:importacoes")).toBe('["imp-2"]');
  });
});
