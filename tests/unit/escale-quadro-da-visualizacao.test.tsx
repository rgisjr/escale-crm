import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BoardData } from "@/lib/kanban/types";

const busca = vi.hoisted(() => ({ atual: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/app/pipelines/visualizacoes/v-1",
  useSearchParams: () => new URLSearchParams(busca.atual),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/escale/useQuadrosDaVisualizacao", () => ({ useQuadrosDaVisualizacao: vi.fn() }));
vi.mock("@/components/escale/visualizacoes/QuadroCombinado", () => ({
  QuadroCombinado: ({ leads }: { leads: Array<{ id: string }> }) => (
    <ul aria-label="quadro">
      {leads.map((l) => (
        <li key={l.id}>{l.id}</li>
      ))}
    </ul>
  ),
}));
vi.mock("@/components/escale/filtros/BarraDoQuadro", () => ({
  BarraDoQuadro: (p: {
    alvo: { tipo: string; id: string };
    contagem: number;
    onAtualizar: () => void;
  }) => (
    <button
      type="button"
      onClick={p.onAtualizar}
    >{`barra ${p.alvo.tipo} ${p.alvo.id}: ${p.contagem}`}</button>
  ),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL" }),
}));
vi.mock("@/components/kanban/BulkActionBar", () => ({
  BulkActionBar: ({
    pipelineId,
    stages,
    selectedIds,
  }: {
    pipelineId: string;
    stages: unknown[];
    selectedIds: string[];
  }) => <p>{`lote ${pipelineId} ${stages.length} ${selectedIds.length}`}</p>,
}));
vi.mock("@/components/kanban/NewLeadDialog", () => ({
  NewLeadDialog: ({ pipelineId, stages }: { pipelineId: string; stages: unknown[] }) => (
    <p>{`novo em ${pipelineId} com ${stages.length} etapas`}</p>
  ),
}));

import { useQuadrosDaVisualizacao } from "@/hooks/escale/useQuadrosDaVisualizacao";
import { LoteDaVisualizacao } from "@/components/escale/visualizacoes/LoteDaVisualizacao";
import { QuadroDaVisualizacao } from "@/components/escale/visualizacoes/QuadroDaVisualizacao";
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const atualizarOrigens = vi.fn();

const lead = (id: string, pipeline_id: string, status: string) =>
  ({
    id,
    pipeline_id,
    status,
    stage_id: `${pipeline_id}1`,
    tags: [],
    owner_user_id: null,
    owner_agent_id: null,
  }) as never;
const QUADROS = [
  {
    pipeline: { id: "A", name: "Leads", settings: {}, vocabulary: null },
    stages: [{ id: "A1", name: "Entrada" }],
    leads: [lead("a-aberto", "A", "open"), lead("a-ganho", "A", "won")],
  },
  {
    pipeline: { id: "B", name: "Parceiros", settings: {}, vocabulary: null },
    stages: [
      { id: "B1", name: "Entrada" },
      { id: "B2", name: "Proposta" },
    ],
    leads: [lead("b-aberto", "B", "open")],
  },
] as unknown as BoardData[];
const ORIGENS = [
  { id: "A", name: "Leads" },
  { id: "B", name: "Parceiros" },
  { id: "C", name: "Fechada para mim" },
];

beforeEach(() => {
  busca.atual = "";
  vi.mocked(useQuadrosDaVisualizacao).mockReturnValue({
    quadros: QUADROS,
    carregando: false,
    indisponiveis: [],
    atualizar: atualizarOrigens,
    atualizando: false,
  });
});

const idsNoQuadro = () =>
  Array.from(screen.getByRole("list", { name: "quadro" }).querySelectorAll("li")).map(
    (li) => li.textContent,
  );

describe("<QuadroDaVisualizacao>", () => {
  it("mostra o nome com a sobrelinha da Clint e as origens que não abriram para quem olha", () => {
    vi.mocked(useQuadrosDaVisualizacao).mockReturnValue({
      quadros: QUADROS,
      carregando: false,
      indisponiveis: ["C"],
      atualizar: atualizarOrigens,
      atualizando: false,
    });
    render(<QuadroDaVisualizacao id="v-1" nome="Time comercial" origens={ORIGENS} />);
    expect(screen.getByRole("heading", { level: 1, name: "Time comercial" })).toBeInTheDocument();
    expect(screen.getByText("Negócios da visualização")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "1 origem desta visualização não abriu para você.",
    );
    expect(useQuadrosDaVisualizacao).toHaveBeenLastCalledWith(["A", "B", "C"]);
  });

  it("os cards das origens vão juntos; abre em Em aberto, e o status da URL vale em todas", () => {
    render(<QuadroDaVisualizacao id="v-1" nome="Time" origens={ORIGENS} />);
    expect(idsNoQuadro()).toEqual(["a-aberto", "b-aberto"]);
    busca.atual = "st=open,won,lost";
    render(<QuadroDaVisualizacao id="v-1" nome="Time 2" origens={ORIGENS} />);
    expect(
      Array.from(screen.getAllByRole("list", { name: "quadro" })[1]!.querySelectorAll("li")).map(
        (li) => li.textContent,
      ),
    ).toEqual(["a-aberto", "a-ganho", "b-aberto"]);
  });

  it("a barra é da visualização (alvo dos filtros salvos), conta os cards e Atualizar relê as origens", async () => {
    render(<QuadroDaVisualizacao id="v-1" nome="Time" origens={ORIGENS} />);
    const botao = screen.getByRole("button", { name: "barra visualizacao v-1: 2" });
    await userEvent.setup().click(botao);
    expect(atualizarOrigens).toHaveBeenCalled();
  });

  it("'Negócio +' pergunta em qual origem e abre o formulário com as etapas dela", async () => {
    render(<QuadroDaVisualizacao id="v-1" nome="Time" origens={ORIGENS} />);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByRole("button", { name: /^Negócio/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Parceiros" }));
    expect(screen.getByText("novo em B com 2 etapas")).toBeInTheDocument();
  });

  it("sem origem ativa, explica o que fazer; carregando, avisa", () => {
    const { unmount } = render(<QuadroDaVisualizacao id="v-1" nome="Time" origens={[]} />);
    expect(
      screen.getByText(
        "Nenhuma origem desta visualização está ativa. Edite as origens pelo ⋮ da visualização.",
      ),
    ).toBeInTheDocument();
    unmount();
    vi.mocked(useQuadrosDaVisualizacao).mockReturnValue({
      quadros: [],
      carregando: true,
      indisponiveis: [],
      atualizar: atualizarOrigens,
      atualizando: false,
    });
    render(<QuadroDaVisualizacao id="v-1" nome="Time" origens={ORIGENS} />);
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
  });
});

describe("<LoteDaVisualizacao>", () => {
  it("cards de uma origem só: a barra de lote do funil, com as etapas dessa origem", () => {
    render(<LoteDaVisualizacao selecionados={["b-aberto"]} quadros={QUADROS} onLimpar={vi.fn()} />);
    expect(screen.getByText("lote B 2 1")).toBeInTheDocument();
  });

  it("cards de várias origens: avisa que o lote é uma origem por vez e oferece limpar", async () => {
    const onLimpar = vi.fn();
    render(
      <LoteDaVisualizacao
        selecionados={["a-aberto", "b-aberto"]}
        quadros={QUADROS}
        onLimpar={onLimpar}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "2 negócios de 2 origens selecionados. A ação em lote vale para uma origem por vez.",
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Limpar seleção" }));
    expect(onLimpar).toHaveBeenCalled();
  });

  it("seleção velha (ids que não estão em nenhum quadro): nada aparece, em vez de '0 origens'", () => {
    const { container } = render(
      <LoteDaVisualizacao
        selecionados={["sumiu-1", "sumiu-2"]}
        quadros={QUADROS}
        onLimpar={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("nada selecionado: nada aparece", () => {
    const { container } = render(
      <LoteDaVisualizacao selecionados={[]} quadros={QUADROS} onLimpar={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
