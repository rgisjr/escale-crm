import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const busca = vi.hoisted(() => ({ atual: "" }));
const quadro = vi.hoisted(() => {
  const lead = (id: string, stage_id: string, status: string) => ({
    id,
    stage_id,
    status,
    pipeline_id: "p-1",
    title: id,
    description: null,
    tags: [],
    owner_user_id: null,
    owner_agent_id: null,
    value_cents: null,
    currency: null,
    lost_reason: status === "lost" ? "price" : null,
    expected_close_date: null,
    position_in_stage: 1000,
    created_at: "2026-10-14T12:00:00Z",
    stage_changed_at: "2026-10-14T12:00:00Z",
    updated_at: "2026-10-14T12:00:00Z",
    custom_fields: {},
  });
  return {
    refetch: vi.fn(),
    dados: {
      pipeline: { id: "p-1", name: "Vendas", vocabulary: null, settings: {} },
      stages: [
        { id: "entrada", name: "Entrada", position: 1, is_won: false, is_lost: false },
        { id: "proposta", name: "Proposta", position: 2, is_won: false, is_lost: false },
        { id: "ganho", name: "Ganho", position: 3, is_won: true, is_lost: false },
        { id: "perdido", name: "Perdido", position: 4, is_won: false, is_lost: true },
      ],
      leads: [
        lead("l-aberto", "entrada", "open"),
        lead("l-ganho", "ganho", "won"),
        lead("l-perdido", "perdido", "lost"),
      ],
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/app/pipelines/p-1",
  useSearchParams: () => new URLSearchParams(busca.atual),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u-1" }),
  useActiveOrg: () => ({ orgId: "org-1", role: "agent", currency: "BRL" }),
  usePermission: () => false,
}));
vi.mock("@/hooks/kanban/useBoard", () => ({
  useBoard: () => ({
    data: quadro.dados,
    isLoading: false,
    error: null,
    pulses: new Map(),
    realtimeStatus: "SUBSCRIBED",
    seguranca: { divergencias: 0, ultimaVerificacao: null },
    refetch: quadro.refetch,
    isFetching: false,
  }),
  chaveDoQuadro: (id: string | null) => ["board", id],
}));
vi.mock("@/components/kanban/KanbanBoard", () => ({
  KanbanBoard: (p: {
    stages: Array<{ name: string }>;
    leads: Array<{ id: string }>;
    ordemDosCards?: unknown;
    aparencia?: string;
    aoAdicionarNegocio?: (stageId: string) => void;
    podeSelecionarNaEtapa?: boolean;
  }) => (
    <div>
      <p>{`etapas: ${p.stages.map((s) => s.name).join(", ")}`}</p>
      <p>{`cards: ${p.leads.map((l) => l.id).join(", ")}`}</p>
      <p>{`ordem: ${typeof p.ordemDosCards}`}</p>
      <p>{`aparencia: ${p.aparencia ?? "original"}`}</p>
      <p>{`adicionar: ${typeof p.aoAdicionarNegocio}`}</p>
      <p>{`selecionar: ${String(p.podeSelecionarNaEtapa)}`}</p>
      <button type="button" onClick={() => p.aoAdicionarNegocio?.("e-2")}>
        adicionar na e-2
      </button>
    </div>
  ),
}));
vi.mock("@/components/escale/filtros/BarraDoQuadro", () => ({
  BarraDoQuadro: (p: { contagem: number; onAtualizar: () => void }) => (
    <button type="button" onClick={p.onAtualizar}>{`barra nova: ${p.contagem}`}</button>
  ),
}));
vi.mock("@/components/kanban/FilterBar", () => ({ FilterBar: () => <p>barra do original</p> }));
vi.mock("@/components/kanban/BulkActionBar", () => ({ BulkActionBar: () => null }));
vi.mock("@/components/kanban/NewLeadDialog", () => ({
  NewLeadDialog: ({ open, etapaInicial }: { open: boolean; etapaInicial?: string | null }) =>
    open ? <p>{`novo negócio aberto na etapa ${etapaInicial ?? "padrão"}`}</p> : null,
}));
vi.mock("@/components/kanban/CalendarioDoFunil", () => ({ CalendarioDoFunil: () => null }));

import type { Role } from "@/lib/auth/types";
import { PipelinePageClient } from "@/app/app/pipelines/[id]/_client";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

const DOIS_FUNIS = [
  { id: "p-1", name: "Vendas" },
  { id: "p-2", name: "Pós-venda" },
];
const abrir = (
  cascaNova: boolean,
  funis = [{ id: "p-1", name: "Vendas" }],
  role: Role = "agent",
) =>
  render(
    <PipelinePageClient
      pipelineId="p-1"
      initialName="Vendas"
      role={role}
      funis={funis}
      cascaNova={cascaNova}
    />,
  );

beforeEach(() => {
  busca.atual = "";
  quadro.refetch.mockReset();
});

describe("a página do funil com a casca nova (Fase 1D)", () => {
  it("abre em Em aberto: as colunas de ganho e de perda somem, e a contagem é a dos abertos", () => {
    abrir(true);
    expect(screen.getByText("etapas: Entrada, Proposta")).toBeInTheDocument();
    expect(screen.getByText("cards: l-aberto")).toBeInTheDocument();
    expect(screen.getByText("barra nova: 1")).toBeInTheDocument();
    expect(screen.getByText("ordem: undefined")).toBeInTheDocument();
  });

  it("status com ganhos traz a coluna de ganho e os ganhos de volta", () => {
    busca.atual = "st=open,won";
    abrir(true);
    expect(screen.getByText("etapas: Entrada, Proposta, Ganho")).toBeInTheDocument();
    expect(screen.getByText("cards: l-aberto, l-ganho")).toBeInTheDocument();
    expect(screen.getByText("barra nova: 2")).toBeInTheDocument();
  });

  it("a ordenação da URL chega ao quadro", () => {
    busca.atual = `f=${encodeURIComponent(JSON.stringify({ ordem: [{ campo: "negocio.valor", direcao: "desc" }] }))}`;
    abrir(true);
    expect(screen.getByText("ordem: function")).toBeInTheDocument();
  });

  it("Atualizar relê o quadro", async () => {
    abrir(true);
    await userEvent.setup().click(screen.getByRole("button", { name: "barra nova: 1" }));
    expect(quadro.refetch).toHaveBeenCalled();
  });

  it("sem a casca nova, o quadro do original fica como está", () => {
    abrir(false, DOIS_FUNIS);
    expect(screen.getByText("barra do original")).toBeInTheDocument();
    expect(screen.getByText("etapas: Entrada, Proposta, Ganho, Perdido")).toBeInTheDocument();
    expect(screen.getByText("cards: l-aberto, l-ganho, l-perdido")).toBeInTheDocument();
    expect(screen.getByText("aparencia: original")).toBeInTheDocument();
    expect(screen.getByText("adicionar: undefined")).toBeInTheDocument();
    expect(screen.getByTestId("trocar-funil")).toBeInTheDocument();
    expect(screen.getByTestId("visao-quadro")).toBeInTheDocument();
    expect(screen.getByTestId("visao-calendario")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo Lead/ })).toBeInTheDocument();
    expect(screen.queryByText("Negócios da origem")).not.toBeInTheDocument();
  });

  it("com a casca: o cabeçalho da Clint, sem seletor no título e sem Quadro/Calendário; o quadro na aparência da casca", () => {
    abrir(true, DOIS_FUNIS);
    expect(screen.getByText("Negócios da origem")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Vendas" })).toBeInTheDocument();
    expect(screen.queryByTestId("trocar-funil")).not.toBeInTheDocument();
    expect(screen.queryByTestId("visao-quadro")).not.toBeInTheDocument();
    expect(screen.queryByTestId("visao-calendario")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Novo Lead/ })).not.toBeInTheDocument();
    expect(screen.getByText("aparencia: casca")).toBeInTheDocument();
    expect(screen.getByText("adicionar: function")).toBeInTheDocument();
  });

  it("com a casca, 'Negócio +' abre o Novo negócio de sempre", async () => {
    abrir(true);
    await userEvent.setup().click(screen.getByRole("button", { name: /^Negócio/ }));
    expect(screen.getByText("novo negócio aberto na etapa padrão")).toBeInTheDocument();
  });

  it("'+ Adicionar negócio' da coluna abre o Novo negócio já na etapa dela", async () => {
    abrir(true);
    await userEvent.setup().click(screen.getByRole("button", { name: "adicionar na e-2" }));
    expect(screen.getByText("novo negócio aberto na etapa e-2")).toBeInTheDocument();
  });

  it("viewer: sem '+ Adicionar negócio' e sem seleção por etapa", () => {
    abrir(true, undefined, "viewer");
    expect(screen.getByText("adicionar: undefined")).toBeInTheDocument();
    expect(screen.getByText("selecionar: false")).toBeInTheDocument();
  });
});
