import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BoardData, Pipeline, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

const capturado = vi.hoisted(() => ({ onDragEnd: null as ((r: unknown) => void) | null }));
const mover = vi.hoisted(() => vi.fn());

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ onDragEnd, children }: { onDragEnd: (r: unknown) => void; children: ReactNode }) => {
    capturado.onDragEnd = onDragEnd;
    return <div>{children}</div>;
  },
}));
vi.mock("@/components/kanban/StageColumn", () => ({
  StageColumn: ({ stage, leads }: { stage: { id: string }; leads: Array<{ id: string }> }) => (
    <ol aria-label={stage.id}>
      {leads.map((l) => (
        <li key={l.id}>{l.id}</li>
      ))}
    </ol>
  ),
}));
vi.mock("@/components/kanban/LeadDossier", () => ({ LeadDossier: () => null }));
vi.mock("@/components/kanban/CamposObrigatoriosDialog", () => ({ CamposObrigatoriosDialog: () => null }));
vi.mock("@/components/kanban/RetomarComoNovoNegocioDialog", () => ({ RetomarComoNovoNegocioDialog: () => null }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [] }) }));
vi.mock("@/hooks/leads/useAtRiskLeads", () => ({ useAtRiskLeads: () => ({ data: null }) }));
vi.mock("@/hooks/leads/useReactivations", () => ({ useReactivations: () => ({ data: [] }) }));
vi.mock("@/hooks/kanban/useRenameStage", () => ({ useRenameStage: () => ({ mutate: vi.fn() }) }));
vi.mock("@/hooks/kanban/useBoard", () => ({
  useBoard: () => ({ data: undefined, isLoading: false, isError: false, error: null, pulses: new Map() }),
  chaveDoQuadro: (id: string | null) => ["board", id],
}));
vi.mock("@/hooks/kanban/useMoveCard", () => ({ useMoveCard: () => ({ mutate: mover, isPending: false }) }));

import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { comparadorDaOrdem } from "@/lib/escale/filtros/ordenar";

const etapa = (id: string) => ({ id, pipeline_id: "p-1", name: id, position: 1, is_won: false, is_lost: false }) as Stage;
const lead = (id: string, stage_id: string, value_cents: number, position_in_stage: number) =>
  ({ id, stage_id, value_cents, position_in_stage, pipeline_id: "p-1", status: "open", updated_at: `upd-${id}` }) as unknown as Lead;

const ETAPAS = [etapa("e1"), etapa("e2")];
const LEADS = [lead("barato", "e1", 100, 1000), lead("caro", "e1", 900, 2000), lead("medio", "e1", 500, 3000), lead("outro", "e2", 50, 5000)];
const PELO_VALOR = comparadorDaOrdem([{ campo: "negocio.valor", direcao: "desc" }]);

function renderizar(ordemDosCards?: (a: Lead, b: Lead) => number) {
  const qc = new QueryClient();
  // O quadro SEM filtro na cache: tem um card que a tela não mostra, no fim da e2.
  qc.setQueryData(["board", "p-1"], { pipeline: {}, stages: ETAPAS, leads: [...LEADS, lead("escondido", "e2", 0, 9000)] } as unknown as BoardData);
  render(
    <QueryClientProvider client={qc}>
      <KanbanBoard pipelineId="p-1" stages={ETAPAS} leads={LEADS} pipeline={{ settings: {} } as Pipeline} ordemDosCards={ordemDosCards} />
    </QueryClientProvider>,
  );
}

const cardsDe = (etapaId: string) =>
  Array.from(screen.getByRole("list", { name: etapaId }).querySelectorAll("li")).map((li) => li.textContent);

const soltar = (draggableId: string, de: string, para: string, index = 0) =>
  act(async () => {
    capturado.onDragEnd?.({
      draggableId,
      source: { droppableId: de, index: 0 },
      destination: { droppableId: para, index },
      reason: "DROP",
      type: "DEFAULT",
      mode: "FLUID",
    });
  });

beforeEach(() => {
  capturado.onDragEnd = null;
  mover.mockReset();
});

describe("<KanbanBoard> com a ordenação da barra (Fase 1D)", () => {
  it("sem ordenação, a coluna segue a ordem manual", () => {
    renderizar();
    expect(cardsDe("e1")).toEqual(["barato", "caro", "medio"]);
  });

  it("com ordenação, a coluna segue o comparador", () => {
    renderizar(PELO_VALOR);
    expect(cardsDe("e1")).toEqual(["caro", "medio", "barato"]);
  });

  it("com ordenação, arrastar dentro da coluna não move", async () => {
    renderizar(PELO_VALOR);
    await soltar("barato", "e1", "e1", 2);
    expect(mover).not.toHaveBeenCalled();
  });

  it("com ordenação, soltar em outra etapa põe o card depois do último da etapa INTEIRA", async () => {
    renderizar(PELO_VALOR);
    await soltar("caro", "e1", "e2");
    expect(mover).toHaveBeenCalledWith({ leadId: "caro", stageId: "e2", positionInStage: 10000, expectedUpdatedAt: "upd-caro" });
  });

  it("sem ordenação, arrastar dentro da coluna continua movendo (o comportamento do original)", async () => {
    renderizar();
    await soltar("barato", "e1", "e1", 2);
    expect(mover).toHaveBeenCalledWith(expect.objectContaining({ leadId: "barato", stageId: "e1" }));
  });
});
