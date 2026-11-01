import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => undefined;
  proto.releasePointerCapture ??= () => undefined;
  proto.scrollIntoView ??= () => undefined;
});

const h = vi.hoisted(() => ({
  push: vi.fn(),
  resumo: vi.fn(),
  execucoes: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, replace: vi.fn() }) }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
vi.mock("@/hooks/escale/useAutomacoesDaCasca", () => ({
  useAcoesDasAutomacoes: () => ({
    excluir: { mutate: vi.fn(), isPending: false },
    duplicar: { mutate: vi.fn(), isPending: false },
  }),
  useOrganizarAoCriar: () => vi.fn(),
}));
vi.mock("@/hooks/webhooks/useAutomationRules", () => ({
  useCreateAutomationRule: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUpdateAutomationRule: () => ({ isPending: false, mutateAsync: vi.fn(), mutate: vi.fn() }),
  useAutomationRule: () => ({ data: undefined, isPending: false, isError: false, error: null }),
  useResendAutomationRun: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/escale/useInsightsDaAutomacao", () => ({
  useResumoDaAutomacao: (...a: unknown[]) => h.resumo(...a),
  useExecucoesDaAutomacao: (...a: unknown[]) => h.execucoes(...a),
  queryDasExecucoes: () => "",
  exportarExecucoesEmCsv: vi.fn(),
}));
vi.mock("@/app/app/webhooks/_components/ActivityTab", () => ({ explicacaoDe: () => null }));
// O canvas do editor, os dos Insights e os painéis têm testes próprios: aqui só os pontos de contato.
vi.mock("@/components/escale/automacoes/fluxo/CanvasDoFluxo", () => ({
  nodeTypes: {},
  OPCOES_DA_ARESTA: {},
  CanvasDoFluxo: (p: { aoClicarNo: (id: string) => void }) => (
    <div data-testid="canvas">
      <button type="button" onClick={() => p.aoClicarNo("gatilho")}>no-gatilho</button>
    </div>
  ),
}));
vi.mock("@/components/escale/automacoes/fluxo/insights/CanvasDosInsights", () => ({
  CanvasDosInsights: () => <div data-testid="canvas-insights" />,
}));
vi.mock("@/components/escale/automacoes/fluxo/painel/PainelDoGatilho", () => ({
  PainelDoGatilho: (p: { aoMudarRascunho: (s: boolean) => void }) => (
    <div data-testid="painel-gatilho">
      <button type="button" onClick={() => p.aoMudarRascunho(true)}>mexer-no-painel</button>
    </div>
  ),
}));

import { InsightsDoFluxo } from "@/components/escale/automacoes/fluxo/insights/InsightsDoFluxo";
import { TelaDoFluxo } from "@/components/escale/automacoes/fluxo/TelaDoFluxo";
import type { AutomationRuleRow } from "@/hooks/webhooks/useAutomationRules";

const RESUMO = { total: 40, sucesso: 30, parcial: 0, falhou: 10, adiado: 0, ultima: "2026-10-30T12:00:00Z", passos: [] };

function regra(): AutomationRuleRow {
  return {
    id: "r1",
    organization_id: "o1",
    name: "Boas-vindas",
    trigger_event: "contact.tag_added",
    trigger_config: {},
    conditions: [],
    actions: [{ type: "add_tag", config: { tags: ["a"] } }],
    is_active: true,
    last_run_at: null,
    run_count: 0,
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-30T10:00:00Z",
    last_change_actor_kind: null,
    last_change_at: null,
  };
}

const montar = (r: AutomationRuleRow | null = regra()) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReactFlowProvider>
        <TelaDoFluxo regra={r} fuso="America/Sao_Paulo" />
      </ReactFlowProvider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  h.resumo.mockReturnValue({ data: RESUMO, isPending: false, isError: false, refetch: vi.fn() });
  h.execucoes.mockReturnValue({ data: { total: 0, linhas: [] }, isPending: false, isError: false, refetch: vi.fn() });
});

describe("cabeçalho nos Insights", () => {
  it("com a automação gravada a aba Insights está ligada; na nova, desligada", () => {
    const { unmount } = montar();
    expect((screen.getByRole("tab", { name: "Insights" }) as HTMLButtonElement).disabled).toBe(false);
    unmount();
    montar(null);
    expect((screen.getByRole("tab", { name: "Insights" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("em Insights: 'Editar automação' no lugar do interruptor e do Salvar, e volta ao Editor", async () => {
    montar();
    expect(screen.getByRole("switch")).toBeTruthy();
    await userEvent.click(screen.getByRole("tab", { name: "Insights" }));
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Editar automação" }));
    expect(screen.getByRole("switch")).toBeTruthy();
    expect(screen.getByTestId("canvas")).toBeTruthy();
  });
});

describe("tela nos Insights", () => {
  it("trocar de aba troca o canvas, o painel do nó e a paleta pelos Insights", async () => {
    montar();
    expect(screen.getByTestId("canvas")).toBeTruthy();
    await userEvent.click(screen.getByRole("tab", { name: "Insights" }));
    expect(screen.queryByTestId("canvas")).toBeNull();
    expect(screen.getByTestId("canvas-insights")).toBeTruthy();
    expect(screen.getByText("Resultados da automação")).toBeTruthy();
    expect(h.resumo).toHaveBeenCalledWith("r1", "30d");
  });

  it("com rascunho no painel do nó, entrar em Insights pede 'Configuração do gatilho não salva'", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "no-gatilho" }));
    await userEvent.click(screen.getByRole("button", { name: "mexer-no-painel" }));
    await userEvent.click(screen.getByRole("tab", { name: "Insights" }));
    expect(screen.getByText("Configuração do gatilho não salva")).toBeTruthy();
    expect(screen.queryByTestId("canvas-insights")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Descartar e continuar" }));
    expect(screen.getByTestId("canvas-insights")).toBeTruthy();
  });

  it("sem alterações não salvas não há pílula", async () => {
    montar();
    await userEvent.click(screen.getByRole("tab", { name: "Insights" }));
    expect(screen.queryByText(/Você está vendo a versão salva/)).toBeNull();
  });

  it("recolher o painel esconde os números, e o botão vira 'Abrir painel'", async () => {
    montar();
    await userEvent.click(screen.getByRole("tab", { name: "Insights" }));
    await userEvent.click(screen.getByRole("button", { name: "Recolher painel" }));
    expect(screen.queryByText("Resultados da automação")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Abrir painel" }));
    expect(screen.getByText("Resultados da automação")).toBeTruthy();
  });

  it("clicar num cartão abre a listagem com o filtro dele; fechar volta ao canvas", async () => {
    montar();
    await userEvent.click(screen.getByRole("tab", { name: "Insights" }));
    await userEvent.click(screen.getByRole("button", { name: /Com erro/ }));
    expect(screen.getByText("Listagem de execuções")).toBeTruthy();
    const ultima = h.execucoes.mock.calls.at(-1)!;
    expect(ultima[2]).toEqual({ origem: "painel", situacoes: ["failed", "partial"] });
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByText("Listagem de execuções")).toBeNull();
  });

  it("trocar o período pede o resumo do período novo", async () => {
    montar();
    await userEvent.click(screen.getByRole("tab", { name: "Insights" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Período" }));
    await userEvent.click(screen.getByRole("option", { name: "Últimos 7 dias" }));
    expect(h.resumo).toHaveBeenLastCalledWith("r1", "7d");
  });
});

describe("pílula do rascunho", () => {
  const dentro = (sujo: boolean) =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ReactFlowProvider>
          <InsightsDoFluxo regra={regra()} fuso="America/Sao_Paulo" sujo={sujo} />
        </ReactFlowProvider>
      </QueryClientProvider>,
    );

  it("com alterações não salvas avisa que o que se vê é a versão salva", () => {
    dentro(true);
    expect(screen.getByText("Você está vendo a versão salva. As alterações não salvas não aparecem aqui.")).toBeTruthy();
  });

  it("sem alterações não aparece", () => {
    dentro(false);
    expect(screen.queryByText(/Você está vendo a versão salva/)).toBeNull();
  });
});

describe("css", () => {
  it("o app/escale-tema.css tem o bloco da Fase 5C", () => {
    const css = readFileSync(join(process.cwd(), "app/escale-tema.css"), "utf8");
    expect(css).toContain("Fase 5C");
    expect(css).toContain("[data-escale-fluxo-insights] .react-flow__edge");
  });
});
