import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hello-pangea/dnd", () => ({
  Droppable: ({ children }: { children: (p: unknown, s: unknown) => ReactNode }) =>
    children(
      { innerRef: () => {}, droppableProps: {}, placeholder: null },
      { isDraggingOver: false },
    ),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/escale/usePrefsDoCard", () => ({ usePrefsDoCard: () => ({ data: null }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org-1", role: "agent" }),
  useUser: () => ({ id: "u-1" }),
}));
vi.mock("@/components/escale/quadro/CardDaCasca", () => ({
  CardDaCasca: ({
    lead,
    onSelect,
  }: {
    lead: { id: string };
    onSelect?: (id: string, gesto: "alterna" | "intervalo") => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => onSelect?.(lead.id, "alterna")}
      >{`marcar ${lead.id}`}</button>
      <button
        type="button"
        onClick={() => onSelect?.(lead.id, "intervalo")}
      >{`até ${lead.id}`}</button>
    </div>
  ),
}));

import { ColunaDoFunilNaCasca } from "@/components/escale/quadro/ColunaDoFunilNaCasca";
import type { Stage } from "@/lib/kanban/types";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const etapa = (over: Partial<Stage> = {}) =>
  ({
    id: "e1",
    pipeline_id: "p-1",
    name: "1. Entrada Lead",
    position: 1,
    is_won: false,
    is_lost: false,
    is_archived: false,
    color: null,
    ...over,
  }) as Stage;
const LEADS = [
  negocio("a", { value_cents: 1_000_000 }),
  negocio("b", { value_cents: 250_000 }),
  negocio("c"),
];

function coluna(extra: Partial<ComponentProps<typeof ColunaDoFunilNaCasca>> = {}) {
  const onSelectMany = vi.fn();
  render(
    <ColunaDoFunilNaCasca
      stage={etapa()}
      leads={LEADS}
      pipelineId="p-1"
      selectedLeadIds={new Set()}
      onSelectMany={onSelectMany}
      {...extra}
    />,
  );
  return { onSelectMany, u: userEvent.setup({ pointerEventsCheck: 0 }) };
}

describe("<ColunaDoFunilNaCasca> (Casca V4)", () => {
  it("o cabeçalho da Clint: nome, total em R$ e contagem; com os ganchos do original", () => {
    coluna();
    const raia = document.querySelector('[data-etapa-do-quadro="e1"]') as HTMLElement;
    expect(raia).not.toBeNull();
    const cabecalho = raia.querySelector("[data-cabecalho-da-etapa]") as HTMLElement;
    expect(within(cabecalho).getByRole("heading", { level: 2 })).toHaveTextContent(
      "1. Entrada Lead",
    );
    expect(within(cabecalho).getByText("R$12.500")).toBeInTheDocument();
    expect(within(cabecalho).getByText("3")).toBeInTheDocument();
  });

  it("coluna sem valor nenhum mostra R$0, nunca 'undefined'", () => {
    coluna({ leads: [negocio("x")] });
    expect(screen.getByText("R$0")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("undefined");
  });

  it("'+ Adicionar negócio' nas etapas abertas avisa a etapa; na de ganho não aparece", async () => {
    const aoAdicionar = vi.fn();
    const { u } = coluna({ aoAdicionar });
    const botao = screen.getByRole("button", { name: "+ Adicionar negócio" });
    expect(botao).toHaveClass("justify-start");
    await u.click(botao);
    expect(aoAdicionar).toHaveBeenCalledWith("e1");
  });

  it("na etapa de ganho, sem '+ Adicionar negócio'", () => {
    coluna({ stage: etapa({ is_won: true }), aoAdicionar: vi.fn() });
    expect(screen.queryByRole("button", { name: "+ Adicionar negócio" })).not.toBeInTheDocument();
  });

  it("com menuDaEtapa, o ⋮ da Clint: 'Selecionar todos...' avisa os ids e o número de cards", async () => {
    const aoSelecionarNaEtapa = vi.fn();
    const { u } = coluna({ aoSelecionarNaEtapa });
    await u.click(screen.getByRole("button", { name: "Ações da etapa 1. Entrada Lead" }));
    await u.click(await screen.findByRole("button", { name: "Selecionar todos..." }));
    expect(aoSelecionarNaEtapa).toHaveBeenCalledWith(["a", "b", "c"], 3);
  });

  it("sem menuDaEtapa, não há ⋮ (Visualização, viewer)", () => {
    coluna();
    expect(screen.queryByRole("button", { name: /Ações da etapa/ })).toBeNull();
  });

  it("com todos marcados, a contagem mostra a seleção", () => {
    coluna({ selectedLeadIds: new Set(["a", "b", "c"]) });
    expect(screen.getByText("3/3")).toBeInTheDocument();
  });

  it("shift estende a seleção desde a âncora, na ordem da coluna", async () => {
    const { onSelectMany, u } = coluna();
    await u.click(screen.getByRole("button", { name: "marcar a" }));
    expect(onSelectMany).toHaveBeenLastCalledWith(["a"], true);
    await u.click(screen.getByRole("button", { name: "até c" }));
    expect(onSelectMany).toHaveBeenLastCalledWith(["a", "b", "c"], true);
  });

  it("quem pode renomear edita o nome no lugar; Escape desfaz", async () => {
    const onRenomear = vi.fn();
    const { u } = coluna({ podeRenomear: true, onRenomear });
    const campo = screen.getByTestId("nome-etapa-quadro");
    await u.clear(campo);
    await u.type(campo, "Triagem{Enter}");
    expect(onRenomear).toHaveBeenCalledWith("Triagem", expect.any(Function));
    onRenomear.mockClear();
    await u.clear(campo);
    await u.type(campo, "Outro{Escape}");
    expect(onRenomear).not.toHaveBeenCalled();
  });

  it("renomear recusado devolve o campo ao nome gravado (B2-18)", async () => {
    const onRenomear = vi.fn();
    const { u } = coluna({ podeRenomear: true, onRenomear });
    const campo = screen.getByTestId("nome-etapa-quadro") as HTMLInputElement;
    const gravado = campo.value;
    await u.clear(campo);
    await u.type(campo, "Recusado{Enter}");
    const aoFalhar = onRenomear.mock.calls[0]![1] as () => void;
    await act(async () => aoFalhar());
    expect(campo.value).toBe(gravado);
  });
});
