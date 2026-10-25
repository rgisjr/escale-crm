import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock("@/app/actions/settings/updatePipelineConfig", () => ({
  updatePipelineConfig: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/app/app/settings/tenant/pipelines/_stages", () => ({
  StagesSection: () => null,
  ancoraDasEtapas: () => "etapas",
}));
vi.mock("@/app/app/settings/tenant/pipelines/_mapping", () => ({
  AgentMappingSection: () => null,
  ancoraDoMapeamento: () => "mapeamento",
}));

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { toast } from "sonner";
import { updatePipelineConfig } from "@/app/actions/settings/updatePipelineConfig";
import { PipelinesClient, type PipelineRow } from "@/app/app/settings/tenant/pipelines/_client";

/** B6-14: a server action lançar (rede/timeout) não pode passar sem aviso. */
const FUNIL: PipelineRow = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Leads",
  slug: "leads",
  vocabulary: { lead: "Lead", deal: "Negócio", won: "Ganho", lost: "Perdido" },
  settings: {
    fields: [
      { key: "cpf", label: "CPF", type: "text" },
      { key: "renda", label: "Renda", type: "number" },
    ],
  },
} as PipelineRow;

describe("Configurações › Funis: salvar quando a action lança", () => {
  it("mostra um toast de erro em vez de deixar a rejeição solta", async () => {
    vi.mocked(updatePipelineConfig).mockRejectedValueOnce(new Error("fetch failed"));
    vi.mocked(toast.error).mockClear();
    render(<PipelinesClient pipelines={[FUNIL]} podeEditarConfig />);
    fireEvent.click(screen.getByRole("button", { name: /Salvar vocabulário e campos/i }));
    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Não foi possível salvar. Confira a conexão e tente de novo.",
      ),
    );
  });
});
