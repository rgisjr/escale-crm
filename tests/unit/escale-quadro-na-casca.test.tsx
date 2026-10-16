import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { Pipeline, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/kanban/StageColumn", () => ({
  StageColumn: ({ stage }: { stage: { id: string } }) => <p>{`original ${stage.id}`}</p>,
}));
vi.mock("@/components/escale/quadro/ColunaDoFunilNaCasca", () => ({
  ColunaDoFunilNaCasca: ({
    stage,
    aoAdicionar,
    aoSelecionarNaEtapa,
    selectedLeadIds,
  }: {
    stage: { id: string };
    aoAdicionar?: (id: string) => void;
    aoSelecionarNaEtapa?: (ids: string[], n: number) => void;
    selectedLeadIds?: Set<string>;
  }) => (
    <div>
      <p>{`casca ${stage.id} ${aoAdicionar ? "com" : "sem"} adicionar`}</p>
      <p>{`${aoSelecionarNaEtapa ? "com" : "sem"} selecionar`}</p>
      <p>{`marcados: ${[...(selectedLeadIds ?? [])].join(",")}`}</p>
      <button type="button" onClick={() => aoSelecionarNaEtapa?.(["l1", "l2", "l3"], 2)}>
        selecionar 2
      </button>
    </div>
  ),
}));
vi.mock("@/components/kanban/LeadDossier", () => ({ LeadDossier: () => null }));
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
vi.mock("@/hooks/kanban/useRenameStage", () => ({ useRenameStage: () => ({ mutate: vi.fn() }) }));
vi.mock("@/hooks/kanban/useBoard", () => ({
  useBoard: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    pulses: new Map(),
  }),
  chaveDoQuadro: (id: string | null) => ["board", id],
}));
vi.mock("@/hooks/kanban/useMoveCard", () => ({
  useMoveCard: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { KanbanBoard } from "@/components/kanban/KanbanBoard";

const ETAPAS = [
  { id: "e1", pipeline_id: "p-1", name: "Entrada", position: 1, is_won: false, is_lost: false },
] as Stage[];
const LEADS: Lead[] = [];

function renderizar(
  extra: {
    aparencia?: "casca";
    aoAdicionarNegocio?: (id: string) => void;
    podeSelecionarNaEtapa?: boolean;
    onSelectionChange?: (ids: string[]) => void;
    selectedIds?: string[];
  } = {},
) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <KanbanBoard
        pipelineId="p-1"
        stages={ETAPAS}
        leads={LEADS}
        pipeline={{ settings: {} } as Pipeline}
        {...extra}
      />
    </QueryClientProvider>,
  );
  return document.querySelector("[data-quadro-do-funil]") as HTMLElement;
}

describe("<KanbanBoard> com e sem a casca (Casca V4)", () => {
  it("sem a casca, o quadro é o do original: StageColumn e o contêiner de sempre", () => {
    const quadro = renderizar();
    expect(screen.getByText("original e1")).toBeInTheDocument();
    expect(screen.queryByText(/^casca/)).not.toBeInTheDocument();
    expect(quadro.className).toBe("flex min-h-0 flex-1 items-start gap-3 overflow-auto px-4 pb-4");
  });

  it("na casca: a coluna da Clint, colunas com rolagem própria e o '+ Adicionar negócio' ligado", () => {
    const quadro = renderizar({ aparencia: "casca", aoAdicionarNegocio: vi.fn() });
    expect(screen.getByText("casca e1 com adicionar")).toBeInTheDocument();
    expect(screen.queryByText("original e1")).not.toBeInTheDocument();
    expect(quadro).toHaveClass("overflow-x-auto", "overflow-y-hidden");
    expect(quadro).not.toHaveClass("px-4");
  });

  it("o ⋮ da etapa só liga com podeSelecionarNaEtapa (Fase 1E)", () => {
    renderizar({ aparencia: "casca" });
    expect(screen.getByText("sem selecionar")).toBeInTheDocument();
  });

  it("'Selecione N' troca a seleção da etapa e mantém as das outras (Fase 1E)", async () => {
    const onSelectionChange = vi.fn();
    renderizar({
      aparencia: "casca",
      podeSelecionarNaEtapa: true,
      onSelectionChange,
      selectedIds: ["l1", "l2", "l3", "x"],
    });
    await userEvent.click(screen.getByRole("button", { name: "selecionar 2" }));
    expect(onSelectionChange).toHaveBeenCalledWith(["x", "l1", "l2"]);
  });
});
