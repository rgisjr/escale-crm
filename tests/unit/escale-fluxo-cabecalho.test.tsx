import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => undefined;
  proto.releasePointerCapture ??= () => undefined;
  proto.scrollIntoView ??= () => undefined;
});

const h = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  excluir: vi.fn(),
  duplicar: vi.fn(),
  alternar: vi.fn(),
  regraDaConsulta: { data: undefined as unknown, isPending: false, isError: false, error: null as unknown },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, replace: h.replace }) }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
vi.mock("@/hooks/escale/useAutomacoesDaCasca", () => ({
  useAcoesDasAutomacoes: () => ({
    excluir: { mutate: h.excluir, isPending: false },
    duplicar: { mutate: h.duplicar, isPending: false },
  }),
  useOrganizarAoCriar: () => vi.fn(),
}));
vi.mock("@/hooks/webhooks/useAutomationRules", () => ({
  useCreateAutomationRule: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUpdateAutomationRule: () => ({ isPending: false, mutateAsync: vi.fn(), mutate: h.alternar }),
  useAutomationRule: () => h.regraDaConsulta,
}));
// O canvas e os painéis têm testes próprios: aqui só os pontos de contato com a tela.
vi.mock("@/components/escale/automacoes/fluxo/CanvasDoFluxo", () => ({
  CanvasDoFluxo: (p: {
    fluxo: { nos: { id: string; position: { x: number; y: number } }[] };
    aoClicarNo: (id: string) => void;
    aoClicarFundo: () => void;
    aoSoltar: (passo: string, posicao: { x: number; y: number }) => void;
  }) => (
    <div data-testid="canvas">
      <span data-testid="posicoes">{JSON.stringify(p.fluxo.nos.map((n) => [n.id, n.position]))}</span>
      <button type="button" onClick={() => p.aoClicarNo("gatilho")}>no-gatilho</button>
      <button type="button" onClick={() => p.aoClicarNo("acao-1")}>no-acao-1</button>
      <button type="button" onClick={() => p.aoClicarNo("acao-2")}>no-acao-2</button>
      <button type="button" onClick={p.aoClicarFundo}>fundo</button>
      <button type="button" onClick={() => p.aoSoltar("acoes", { x: 5, y: 6 })}>soltar-acoes</button>
    </div>
  ),
}));
vi.mock("@/components/escale/automacoes/fluxo/painel/PainelDoGatilho", () => ({
  PainelDoGatilho: (p: { aoMudarRascunho: (s: boolean) => void }) => (
    <div data-testid="painel-gatilho">
      <button type="button" onClick={() => p.aoMudarRascunho(true)}>mexer-no-painel</button>
    </div>
  ),
}));
vi.mock("@/components/escale/automacoes/fluxo/painel/PainelDasCondicoes", () => ({
  PainelDasCondicoes: () => <div data-testid="painel-condicoes" />,
}));
vi.mock("@/components/escale/automacoes/fluxo/painel/PainelDaMensagem", () => ({
  PainelDaMensagem: () => <div data-testid="painel-mensagem" />,
}));
vi.mock("@/components/escale/automacoes/fluxo/painel/PainelDaAcao", () => ({
  PainelDaAcao: (p: { aoMudarRascunho: (s: boolean) => void }) => (
    <div data-testid="painel-acao">
      <button type="button" onClick={() => p.aoMudarRascunho(true)}>mexer-no-painel</button>
    </div>
  ),
}));

import { CabecalhoDoFluxo } from "@/components/escale/automacoes/fluxo/CabecalhoDoFluxo";
import { FluxoDaCasca } from "@/components/escale/automacoes/fluxo/FluxoDaCasca";
import { MenuDoFluxo } from "@/components/escale/automacoes/fluxo/MenuDoFluxo";
import { TelaDoFluxo } from "@/components/escale/automacoes/fluxo/TelaDoFluxo";
import type { AutomationRuleRow } from "@/hooks/webhooks/useAutomationRules";
import { ApiError } from "@/lib/api/types";

const AGORA = new Date("2026-10-30T15:00:00.000Z");
const HA_5_MIN = new Date(AGORA.getTime() - 5 * 60_000).toISOString();

function regra(over: Partial<AutomationRuleRow> = {}): AutomationRuleRow {
  return {
    id: "r1",
    organization_id: "o1",
    name: "Boas-vindas",
    trigger_event: "contact.tag_added",
    trigger_config: {},
    conditions: [],
    actions: [
      { type: "add_tag", config: { tags: ["a"] } },
      { type: "add_tag", config: { tags: ["b"] } },
    ],
    is_active: true,
    last_run_at: null,
    run_count: 0,
    created_at: "2026-10-01T10:00:00Z",
    updated_at: HA_5_MIN,
    last_change_actor_kind: null,
    last_change_at: null,
    ...over,
  };
}

const envolver = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReactFlowProvider>{ui}</ReactFlowProvider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("CabecalhoDoFluxo", () => {
  const base = {
    nome: "Boas-vindas",
    existe: true,
    ativo: true,
    sujo: false,
    salvando: false,
    atualizadoEm: HA_5_MIN as string | null,
    fuso: "America/Sao_Paulo",
    aba: "editor" as const,
    insightsDisponivel: false,
    aoMudarAba: vi.fn(),
    aoVoltar: vi.fn(),
    aoRenomear: vi.fn(),
    aoSalvar: vi.fn(),
    aoAlternarAtivo: vi.fn(),
    menu: <span data-testid="menu" />,
  };

  it("ativa: nome, selo, 'Salvo há 5 minutos' com a data BR na dica", () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(AGORA);
    render(<CabecalhoDoFluxo {...base} />);
    expect(screen.getByText("Boas-vindas")).toBeTruthy();
    expect(screen.getByText("Ativa")).toBeTruthy();
    const salvo = screen.getByText("Salvo há 5 minutos");
    expect(salvo.getAttribute("title")).toBe("30/10/2026 11:55:00");
    expect((screen.getByRole("button", { name: "Salvar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("o 'Salvo há' anda sozinho a cada minuto", () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(AGORA);
    render(<CabecalhoDoFluxo {...base} />);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText("Salvo há 6 minutos")).toBeTruthy();
  });

  it("pausada, sujo e nova mostram o selo certo", () => {
    const { rerender } = render(<CabecalhoDoFluxo {...base} ativo={false} />);
    expect(screen.getByText("Pausada")).toBeTruthy();
    rerender(<CabecalhoDoFluxo {...base} sujo />);
    expect(screen.getByText("Alterações não salvas")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Salvar" }) as HTMLButtonElement).disabled).toBe(false);
    rerender(<CabecalhoDoFluxo {...base} existe={false} atualizadoEm={null} />);
    expect(screen.getByText("Nova")).toBeTruthy();
    expect(screen.queryByText(/Salvo há/)).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("abas: Editor selecionada e Insights desabilitada", () => {
    render(<CabecalhoDoFluxo {...base} />);
    expect(screen.getByRole("tab", { name: "Editor" }).getAttribute("aria-selected")).toBe("true");
    expect((screen.getByRole("tab", { name: "Insights" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("o lápis pede para renomear e o interruptor alterna", async () => {
    const aoRenomear = vi.fn();
    const aoAlternarAtivo = vi.fn();
    render(<CabecalhoDoFluxo {...base} aoRenomear={aoRenomear} aoAlternarAtivo={aoAlternarAtivo} />);
    await userEvent.click(screen.getByRole("button", { name: "Renomear automação" }));
    await userEvent.click(screen.getByRole("switch", { name: "Pausar automação" }));
    expect(aoRenomear).toHaveBeenCalled();
    expect(aoAlternarAtivo).toHaveBeenCalledWith(false);
  });
});

describe("MenuDoFluxo", () => {
  const abrir = async () => userEvent.click(screen.getByRole("button", { name: "Mais opções" }));

  it("ordem dos itens e 3 divisórias", async () => {
    envolver(<MenuDoFluxo id="r1" sujo={false} aoEditarNoEditor={vi.fn()} aoOrganizar={vi.fn()} />);
    await abrir();
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Editar no editor",
      "Organizar",
      "Duplicar automação",
      "Excluir",
    ]);
    expect(screen.getAllByRole("separator")).toHaveLength(3);
  });

  it("automação nova: só Organizar", async () => {
    envolver(<MenuDoFluxo id={null} sujo={false} aoEditarNoEditor={vi.fn()} aoOrganizar={vi.fn()} />);
    await abrir();
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Organizar"]);
  });

  it("sujo: Duplicar desabilitado com a dica", async () => {
    envolver(<MenuDoFluxo id="r1" sujo aoEditarNoEditor={vi.fn()} aoOrganizar={vi.fn()} />);
    await abrir();
    const item = screen.getByRole("menuitem", { name: "Duplicar automação" });
    expect(item.getAttribute("aria-disabled")).toBe("true");
    expect(item.getAttribute("title")).toBe("Salve antes de duplicar.");
  });

  it("Excluir confirma e, confirmado, exclui e volta para a lista", async () => {
    h.excluir.mockImplementation((_id: string, o: { onSuccess: () => void }) => o.onSuccess());
    envolver(<MenuDoFluxo id="r1" sujo={false} aoEditarNoEditor={vi.fn()} aoOrganizar={vi.fn()} />);
    await abrir();
    await userEvent.click(screen.getByRole("menuitem", { name: "Excluir" }));
    expect(screen.getByText("Excluir automação")).toBeTruthy();
    expect(screen.getByText("Você deseja excluir esta automação?")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(h.excluir).toHaveBeenCalledWith("r1", expect.anything());
    expect(h.push).toHaveBeenCalledWith("/app/automacoes");
  });

  it("Editar no editor e Organizar chamam os retornos", async () => {
    const aoEditarNoEditor = vi.fn();
    const aoOrganizar = vi.fn();
    envolver(<MenuDoFluxo id="r1" sujo={false} aoEditarNoEditor={aoEditarNoEditor} aoOrganizar={aoOrganizar} />);
    await abrir();
    await userEvent.click(screen.getByRole("menuitem", { name: "Editar no editor" }));
    await abrir();
    await userEvent.click(screen.getByRole("menuitem", { name: "Organizar" }));
    expect(aoEditarNoEditor).toHaveBeenCalled();
    expect(aoOrganizar).toHaveBeenCalled();
  });
});

describe("TelaDoFluxo", () => {
  const montar = (r: AutomationRuleRow | null = regra()) =>
    envolver(<TelaDoFluxo regra={r} fuso="America/Sao_Paulo" />);

  async function ficarSujo() {
    await userEvent.click(screen.getByRole("button", { name: "Renomear automação" }));
    const campo = screen.getByRole("textbox", { name: "Nome da automação" });
    await userEvent.clear(campo);
    await userEvent.type(campo, "Outro nome");
    const dialogo = screen.getByRole("dialog");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));
  }

  it("Voltar limpo vai direto para a lista", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Voltar para as automações" }));
    expect(h.push).toHaveBeenCalledWith("/app/automacoes");
  });

  it("renomear só muda o rascunho; Voltar sujo pede confirmação e 'Sair sem salvar' segue", async () => {
    montar();
    await ficarSujo();
    expect(screen.getByText("Outro nome")).toBeTruthy();
    expect(screen.getByText("Alterações não salvas")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Voltar para as automações" }));
    expect(h.push).not.toHaveBeenCalled();
    expect(screen.getByText("Você está saindo do editor da automação")).toBeTruthy();
    expect(screen.getByText("Alterações não salvas serão perdidas se você continuar sem salvar.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Sair sem salvar" }));
    expect(h.push).toHaveBeenCalledWith("/app/automacoes");
  });

  it("'Editar no editor' vai para a lista com o editor aberto", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Editar no editor" }));
    expect(h.push).toHaveBeenCalledWith("/app/automacoes?editor=r1");
  });

  it("clicar um nó abre o painel do tipo", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "no-gatilho" }));
    expect(screen.getByTestId("painel-gatilho")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "no-acao-1" }));
    expect(screen.queryByTestId("painel-gatilho")).toBeNull();
    expect(screen.getByTestId("painel-acao")).toBeTruthy();
  });

  it("com o rascunho do painel mexido, trocar de nó pede 'Descartar e continuar'", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "no-acao-1" }));
    await userEvent.click(screen.getByRole("button", { name: "mexer-no-painel" }));
    await userEvent.click(screen.getByRole("button", { name: "no-acao-2" }));
    expect(screen.getByText("Configuração do passo não salva")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Descartar e continuar" }));
    expect(screen.queryByText("Configuração do passo não salva")).toBeNull();
    expect(screen.getByTestId("painel-acao")).toBeTruthy();
  });

  it("no gatilho a confirmação fala do gatilho; clicar no fundo também passa pelo guarda", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "no-gatilho" }));
    await userEvent.click(screen.getByRole("button", { name: "mexer-no-painel" }));
    await userEvent.click(screen.getByRole("button", { name: "fundo" }));
    expect(screen.getByText("Configuração do gatilho não salva")).toBeTruthy();
    expect(screen.getByText("Você está saindo da configuração do gatilho")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Descartar e continuar" }));
    expect(screen.queryByTestId("painel-gatilho")).toBeNull();
  });

  it("soltar 'Ações' no canvas abre o modal e 'Realizar ação' cria a caixa onde caiu", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "soltar-acoes" }));
    await userEvent.click(screen.getByText("Tarefa interna"));
    await userEvent.click(screen.getByRole("button", { name: "Realizar ação" }));
    const posicoes = JSON.parse(screen.getByTestId("posicoes").textContent ?? "[]") as [string, { x: number; y: number }][];
    expect(posicoes.find(([id]) => id === "acao-3")?.[1]).toEqual({ x: 5, y: 6 });
  });

  it("o aviso do navegador ao fechar a aba só existe com alterações", async () => {
    montar();
    const antes = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(antes);
    expect(antes.defaultPrevented).toBe(false);
    await ficarSujo();
    const depois = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(depois);
    expect(depois.defaultPrevented).toBe(true);
  });
});

describe("FluxoDaCasca", () => {
  const montar = (id: string) => envolver(<FluxoDaCasca id={id} fuso="America/Sao_Paulo" />);

  it("carregando mostra os esqueletos", () => {
    h.regraDaConsulta = { data: undefined, isPending: true, isError: false, error: null };
    montar("r1");
    expect(screen.getByTestId("fluxo-carregando")).toBeTruthy();
  });

  it("404 mostra o texto de hoje e o botão de voltar", async () => {
    h.regraDaConsulta = { data: undefined, isPending: false, isError: true, error: new ApiError(404, "not_found", undefined, "req-1") };
    montar("r1");
    expect(screen.getByText("Esta automação não existe mais, ou não é desta organização.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Voltar para as automações" }));
    expect(h.push).toHaveBeenCalledWith("/app/automacoes");
  });

  it("outro erro mostra o texto de falha de leitura", () => {
    h.regraDaConsulta = { data: undefined, isPending: false, isError: true, error: new Error("rede") };
    montar("r1");
    expect(screen.getByText(/Não consegui carregar as automações agora/)).toBeTruthy();
  });

  it("regra encontrada monta a tela", () => {
    h.regraDaConsulta = { data: { data: regra() }, isPending: false, isError: false, error: null };
    montar("r1");
    expect(screen.getByText("Boas-vindas")).toBeTruthy();
    expect(screen.getByTestId("canvas")).toBeTruthy();
  });
});
