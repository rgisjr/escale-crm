import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BoardData } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

const capturado = vi.hoisted(() => ({ onDragEnd: null as ((r: unknown) => void) | null }));
const movers = vi.hoisted(
  () => ({ A: vi.fn(), B: vi.fn() }) as Record<string, ReturnType<typeof vi.fn>>,
);
const SEM_PULSOS = vi.hoisted(() => new Map<string, number>());

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({
    onDragEnd,
    children,
  }: {
    onDragEnd: (r: unknown) => void;
    children: ReactNode;
  }) => {
    capturado.onDragEnd = onDragEnd;
    return <div>{children}</div>;
  },
  Droppable: ({ children }: { children: (p: unknown, s: unknown) => ReactNode }) =>
    children(
      { innerRef: () => {}, droppableProps: {}, placeholder: null },
      { isDraggingOver: false },
    ),
}));
vi.mock("@/components/escale/quadro/CardDaCasca", () => ({
  CardDaCasca: ({
    card,
    lead,
    pipelineId,
    onOpen,
  }: {
    card: { title: string; stageName: string };
    lead: { id: string };
    pipelineId: string;
    onOpen?: (id: string) => void;
  }) => (
    <button type="button" data-pipeline={pipelineId} onClick={() => onOpen?.(lead.id)}>
      {`${card.title} — ${card.stageName}`}
    </button>
  ),
}));
vi.mock("@/lib/kanban/card-state", () => ({
  buildCardInput: (lead: { title: string }, opts: { stageName: string }) => ({
    title: lead.title,
    stageName: opts.stageName,
  }),
}));
vi.mock("@/components/kanban/LeadDossier", () => ({
  LeadDossier: ({ pipelineId, stageName }: { pipelineId: string; stageName: string }) => (
    <p>{`dossiê ${pipelineId} ${stageName}`}</p>
  ),
}));
vi.mock("@/components/kanban/CamposObrigatoriosDialog", () => ({
  CamposObrigatoriosDialog: () => null,
}));
vi.mock("@/components/kanban/RetomarComoNovoNegocioDialog", () => ({
  RetomarComoNovoNegocioDialog: () => null,
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [] }),
}));
vi.mock("@/hooks/leads/useAtRiskLeads", () => ({ useAtRiskLeads: () => ({ data: null }) }));
vi.mock("@/hooks/leads/useReactivations", () => ({ useReactivations: () => ({ data: [] }) }));
vi.mock("@/hooks/kanban/useBoard", () => ({
  useBoard: () => ({ pulses: SEM_PULSOS }),
  chaveDoQuadro: (id: string | null) => ["board", id],
}));
vi.mock("@/hooks/kanban/useMoveCard", () => ({
  useMoveCard: (pipelineId: string) => ({ mutate: movers[pipelineId] }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { toast } from "sonner";
import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import { QuadroCombinado } from "@/components/escale/visualizacoes/QuadroCombinado";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const lead = (id: string, pipeline_id: string, stage_id: string, title: string) =>
  ({
    id,
    pipeline_id,
    stage_id,
    title,
    position_in_stage: 1000,
    updated_at: `upd-${id}`,
  }) as unknown as Lead;
const etapa = (id: string, pipeline_id: string, name: string, position: number) => ({
  id,
  pipeline_id,
  name,
  position,
  color: null,
});
const LEAD_A = lead("l-a", "A", "a1", "Ana");
const LEAD_B = lead("l-b", "B", "b1", "Bia");
const QUADROS = [
  {
    pipeline: { id: "A", name: "Leads", settings: {} },
    stages: [etapa("a1", "A", "Entrada", 1), etapa("a2", "A", "Proposta", 2)],
    leads: [LEAD_A],
  },
  {
    pipeline: { id: "B", name: "Parceiros", settings: {} },
    stages: [etapa("b1", "B", "Entrada", 1), etapa("b2", "B", "Qualificação", 2)],
    leads: [LEAD_B],
  },
] as unknown as BoardData[];

const onSelecao = vi.fn();

function renderizar(
  ordemDosCards?: (a: Lead, b: Lead) => number,
  cliente: QueryClient = new QueryClient(),
) {
  render(
    <QueryClientProvider client={cliente}>
      <QuadroCombinado
        quadros={QUADROS}
        leads={[LEAD_A, LEAD_B]}
        selecionados={[]}
        onSelecao={onSelecao}
        ordemDosCards={ordemDosCards}
      />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

const soltar = (draggableId: string, de: string, para: string, index = 0) =>
  act(async () => {
    capturado.onDragEnd?.({
      draggableId,
      source: { droppableId: de, index: 0 },
      destination: { droppableId: para, index },
      reason: "DROP",
      type: "LEAD",
      mode: "FLUID",
    });
  });

beforeEach(() => {
  capturado.onDragEnd = null;
  movers.A!.mockReset();
  movers.B!.mockReset();
  onSelecao.mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("<QuadroCombinado>", () => {
  it("etapas de mesmo nome juntam os cards das origens, e cada card diz de qual origem é", () => {
    renderizar();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Entrada",
      "Qualificação",
      "Proposta",
    ]);
    const entrada = document.querySelector(
      '[data-coluna-da-visualizacao="Entrada"]',
    ) as HTMLElement;
    expect(within(entrada).getByRole("button", { name: "Ana — Entrada · Leads" })).toHaveAttribute(
      "data-pipeline",
      "A",
    );
    expect(
      within(entrada).getByRole("button", { name: "Bia — Entrada · Parceiros" }),
    ).toHaveAttribute("data-pipeline", "B");
  });

  it("soltar numa coluna que a origem do card não tem recusa com aviso e não move", async () => {
    renderizar();
    await soltar("l-a", "coluna:Entrada", "coluna:Qualificação");
    expect(toast.error).toHaveBeenCalledWith("A origem «Leads» não tem a etapa «Qualificação».");
    expect(movers.A).not.toHaveBeenCalled();
  });

  it("soltar numa coluna com a etapa move pela origem do card, com o updated_at dele", async () => {
    renderizar();
    await soltar("l-a", "coluna:Entrada", "coluna:Proposta");
    expect(movers.A).toHaveBeenCalledWith({
      leadId: "l-a",
      stageId: "a2",
      positionInStage: 1000,
      expectedUpdatedAt: "upd-l-a",
    });
    expect(movers.B).not.toHaveBeenCalled();
  });

  it("abrir o card abre o dossiê com a origem e a etapa dele", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Bia — Entrada · Parceiros" }));
    expect(screen.getByText("dossiê B Entrada")).toBeInTheDocument();
  });

  it("selecionar a coluna inteira (pelo ⋮ da coluna) marca os cards das duas origens", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Ações da etapa Entrada" }));
    await user.click(await screen.findByRole("menuitem", { name: "Selecionar todos" }));
    expect(onSelecao).toHaveBeenCalledWith(["l-a", "l-b"]);
  });
});

describe("<QuadroCombinado> com ordenação (Fase 1D)", () => {
  const PELO_TITULO_DESC = (a: Lead, b: Lead) => b.title.localeCompare(a.title);

  it("a coluna combinada segue a ordenação escolhida", () => {
    renderizar(PELO_TITULO_DESC);
    const entrada = document.querySelector(
      '[data-coluna-da-visualizacao="Entrada"]',
    ) as HTMLElement;
    expect(
      within(entrada)
        .getAllByRole("button", { name: /—/ })
        .map((b) => b.textContent),
    ).toEqual(["Bia — Entrada · Parceiros", "Ana — Entrada · Leads"]);
  });

  it("arrastar dentro da mesma coluna não move", async () => {
    renderizar(PELO_TITULO_DESC);
    await soltar("l-a", "coluna:Entrada", "coluna:Entrada", 1);
    expect(movers.A).not.toHaveBeenCalled();
  });

  it("soltar em outra coluna põe o card no fim da etapa inteira da origem dele (inclui card escondido pelo filtro)", async () => {
    // O cache do quadro A (sem filtro) tem um card escondido na etapa de destino, com posição maior
    // que qualquer visível. `leads` (filtrado) chega SEM ele: só o cache sabe do fim real da etapa.
    const escondido = { ...lead("l-oculto", "A", "a2", "Oculto"), position_in_stage: 3000 };
    const cliente = new QueryClient();
    cliente.setQueryData(chaveDoQuadro("A"), { ...QUADROS[0], leads: [LEAD_A, escondido] });
    renderizar(PELO_TITULO_DESC, cliente);
    await soltar("l-a", "coluna:Entrada", "coluna:Proposta");
    expect(movers.A).toHaveBeenCalledTimes(1);
    const chamada = movers.A!.mock.calls[0]![0] as {
      leadId: string;
      stageId: string;
      positionInStage: number;
    };
    expect(chamada).toMatchObject({ leadId: "l-a", stageId: "a2", expectedUpdatedAt: "upd-l-a" });
    expect(chamada.positionInStage).toBeGreaterThan(3000);
  });

  it("origem sem a etapa: recusa com aviso, como sem ordenação", async () => {
    renderizar(PELO_TITULO_DESC);
    await soltar("l-a", "coluna:Entrada", "coluna:Qualificação");
    expect(toast.error).toHaveBeenCalledWith("A origem «Leads» não tem a etapa «Qualificação».");
    expect(movers.A).not.toHaveBeenCalled();
  });
});
