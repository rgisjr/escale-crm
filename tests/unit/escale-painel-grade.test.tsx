import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  props: { atual: null as Record<string, unknown> | null },
  telaGrande: { valor: true },
  mutate: vi.fn(),
}));

vi.mock("react-grid-layout", () => ({
  default: (p: Record<string, unknown> & { children: ReactNode }) => {
    mocks.props.atual = p;
    return <div data-testid="grade">{p.children}</div>;
  },
  useContainerWidth: () => ({ width: 1200, mounted: true, containerRef: () => {} }),
  verticalCompactor: { tipo: "vertical" },
}));
vi.mock("react-grid-layout/css/styles.css", () => ({}));
vi.mock("@/lib/escale/usa-tela-grande", () => ({ useTelaGrande: () => mocks.telaGrande.valor }));
vi.mock("@/hooks/escale/useGraficosDoPainel", () => ({
  useAcoesDosGraficos: () => ({ salvarLayout: { mutate: mocks.mutate } }),
}));
vi.mock("@/components/escale/indicadores/painel/CardDoGrafico", () => ({
  CardDoGrafico: ({ grafico }: { grafico: { id: string } }) => <div data-testid={`card-${grafico.id}`} />,
}));

import { GradeDoPainel } from "@/components/escale/indicadores/painel/GradeDoPainel";
import { FILTRO_PADRAO } from "@/lib/escale/indicadores/painel/filtro";
import type { GraficoDoPainel } from "@/lib/escale/indicadores/graficos/tipos";
import type { Role } from "@/lib/auth/types";

const g = (id: string, x: number, y: number): GraficoDoPainel => ({
  id,
  nome: id,
  descricao: null,
  tipo: "barra",
  layout: { x, y, w: 6, h: 4 },
  pergunta: {},
  opcoes: {},
});
const GRAFICOS = [g("a", 0, 0), g("b", 6, 0)];

function montar(papel: Role = "manager") {
  return render(
    <GradeDoPainel graficos={GRAFICOS} filtro={FILTRO_PADRAO} rodada={0} intervalo={null} papel={papel} painelId="p1" />,
  );
}
const props = () => mocks.props.atual as Record<string, never> & { gridConfig: Record<string, unknown>; dragConfig: Record<string, unknown>; resizeConfig: Record<string, unknown>; layout: Array<Record<string, number>>; compactor: unknown; onDragStop: (l: unknown[]) => void; onResizeStop: (l: unknown[]) => void };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.telaGrande.valor = true;
});

describe("GradeDoPainel", () => {
  it("24 colunas, linha de 40, espaço de 12, mínimo 2 × 2, compactação vertical", () => {
    montar();
    expect(props().gridConfig).toEqual({ cols: 24, rowHeight: 40, margin: [12, 12] });
    expect(props().layout.every((i) => i.minW === 2 && i.minH === 2)).toBe(true);
    expect(props().compactor).toEqual({ tipo: "vertical" });
  });
  it("gerente em tela grande: arrastar e redimensionar ligados, só a alça se", () => {
    montar("manager");
    expect(props().dragConfig).toMatchObject({ enabled: true, cancel: ".nao-arrasta" });
    expect(props().resizeConfig).toEqual({ enabled: true, handles: ["se"] });
  });
  it("agente: desligados", () => {
    montar("agent");
    expect(props().dragConfig.enabled).toBe(false);
    expect(props().resizeConfig.enabled).toBe(false);
  });
  it("tela pequena: 1 coluna, desligados, itens com x 0 e w 1, e nunca grava", () => {
    mocks.telaGrande.valor = false;
    montar("manager");
    expect(props().gridConfig.cols).toBe(1);
    expect(props().dragConfig.enabled).toBe(false);
    expect(props().layout.every((i) => i.x === 0 && i.w === 1)).toBe(true);
    props().onDragStop([{ i: "a", x: 0, y: 5, w: 1, h: 4 }]);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it("ao soltar, grava só o item que mudou; sem mudança não grava", () => {
    montar();
    props().onDragStop([
      { i: "a", x: 0, y: 0, w: 6, h: 4 },
      { i: "b", x: 6, y: 3, w: 6, h: 4 },
    ]);
    expect(mocks.mutate).toHaveBeenCalledWith([{ id: "b", x: 6, y: 3, w: 6, h: 4 }]);
    mocks.mutate.mockClear();
    props().onResizeStop([
      { i: "a", x: 0, y: 0, w: 6, h: 4 },
      { i: "b", x: 6, y: 0, w: 6, h: 4 },
    ]);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
