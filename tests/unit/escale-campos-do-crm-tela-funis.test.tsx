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

/** FORK ESCALE · Fase 1F-a: o campo é do CRM; remover aqui e salvar o remove de toda origem. */
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

async function salvar() {
  fireEvent.click(screen.getByRole("button", { name: /Salvar vocabulário e campos/i }));
  await vi.waitFor(() => expect(updatePipelineConfig).toHaveBeenCalledTimes(1));
  return vi.mocked(updatePipelineConfig).mock.calls[0]?.[1];
}

describe("Configurações › Funis com os campos do CRM", () => {
  it("remover um campo que veio do banco e salvar manda a chave em campos_removidos", async () => {
    vi.mocked(updatePipelineConfig).mockClear();
    render(<PipelinesClient pipelines={[FUNIL]} podeEditarConfig />);
    fireEvent.click(screen.getByRole("button", { name: "Remover campo CPF" }));
    const patch = await salvar();
    expect(patch?.fields?.map((f) => f.key)).toEqual(["renda"]);
    expect(patch?.campos_removidos).toEqual(["cpf"]);
  });

  it("sem remover nada, não manda campos_removidos", async () => {
    vi.mocked(updatePipelineConfig).mockClear();
    render(<PipelinesClient pipelines={[FUNIL]} podeEditarConfig />);
    const patch = await salvar();
    expect(patch?.campos_removidos).toBeUndefined();
  });

  it("campo novo tirado antes de salvar não é apagado do catálogo", async () => {
    vi.mocked(updatePipelineConfig).mockClear();
    render(<PipelinesClient pipelines={[FUNIL]} podeEditarConfig />);
    fireEvent.click(screen.getByRole("button", { name: /Adicionar campo/i }));
    fireEvent.click(screen.getByRole("button", { name: "Remover campo Novo campo" }));
    const patch = await salvar();
    expect(patch?.campos_removidos).toBeUndefined();
  });

  it("avisa que o campo vale em toda origem (texto da Clint para a regra)", () => {
    render(<PipelinesClient pipelines={[FUNIL]} podeEditarConfig />);
    expect(screen.getByText("Campos do negócio (valem em todas as origens)")).toBeInTheDocument();
    expect(
      screen.getByText(/Remover um campo aqui e salvar o remove de toda origem\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Se este campo estiver configurado como obrigatório em alguma origem, a regra será removida\./,
      ),
    ).toBeInTheDocument();
  });

  it("manda as definições que a tela carregou, para o servidor não reverter o que outro administrador mudou", async () => {
    vi.mocked(updatePipelineConfig).mockClear();
    render(<PipelinesClient pipelines={[FUNIL]} podeEditarConfig />);
    const patch = await salvar();
    expect(patch?.campos_carregados).toEqual([
      { key: "cpf", label: "CPF", type: "text" },
      { key: "renda", label: "Renda", type: "number" },
    ]);
  });

  it("explica o erro de conflito de gravação em vez de mostrar o código", async () => {
    vi.mocked(updatePipelineConfig).mockClear();
    vi.mocked(toast.error).mockClear();
    vi.mocked(updatePipelineConfig).mockResolvedValueOnce({
      ok: false,
      error: "campos_em_conflito",
    });
    render(<PipelinesClient pipelines={[FUNIL]} podeEditarConfig />);
    await salvar();
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(vi.mocked(toast.error).mock.calls[0]?.[0]).toMatch(/Tente novamente/);
    expect(vi.mocked(toast.error).mock.calls[0]?.[0]).not.toMatch(/campos_em_conflito/);
  });

  it("avisa para recarregar quando o servidor adotou a versão mais nova de algum campo", async () => {
    vi.mocked(updatePipelineConfig).mockClear();
    vi.mocked(toast.warning).mockClear();
    vi.mocked(updatePipelineConfig).mockResolvedValueOnce({ ok: true, camposDesatualizados: true });
    render(<PipelinesClient pipelines={[FUNIL]} podeEditarConfig />);
    await salvar();
    await vi.waitFor(() => expect(toast.warning).toHaveBeenCalled());
    expect(vi.mocked(toast.warning).mock.calls[0]?.[0]).toMatch(/Recarregue a página/);
  });
});
