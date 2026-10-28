import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consulta: vi.fn(),
  duplicar: vi.fn(),
  excluir: vi.fn(),
  push: vi.fn(),
  baixarCsv: vi.fn(),
  post: vi.fn(),
  sucesso: vi.fn(),
  erro: vi.fn(),
  apareceu: { valor: true },
}));

vi.mock("@/hooks/escale/useResultadoDoGrafico", () => ({ useResultadoDoGrafico: mocks.consulta }));
vi.mock("@/hooks/escale/useCatalogoDeIndicadores", () => ({ useCatalogoDeIndicadores: () => ({ data: undefined }) }));
vi.mock("@/hooks/escale/useApareceuNaTela", () => ({
  useApareceuNaTela: () => ({ ref: () => {}, apareceu: mocks.apareceu.valor }),
}));
vi.mock("@/hooks/escale/useGraficosDoPainel", () => ({
  useAcoesDosGraficos: () => ({
    duplicar: { mutate: mocks.duplicar },
    excluir: { mutate: mocks.excluir, isPending: false },
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/escale/exportar/baixar", () => ({ baixarCsv: mocks.baixarCsv }));
vi.mock("@/lib/api/client", () => ({ apiClient: { post: mocks.post } }));
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: mocks.sucesso, error: mocks.erro } }));
vi.mock("@/components/escale/indicadores/graficos/DesenhoDoGrafico", () => ({
  DesenhoDoGrafico: () => <div data-testid="desenho" />,
}));

import { CardDoGrafico } from "@/components/escale/indicadores/painel/CardDoGrafico";
import { FILTRO_PADRAO } from "@/lib/escale/indicadores/painel/filtro";
import type { GraficoDoPainel } from "@/lib/escale/indicadores/graficos/tipos";
import type { Role } from "@/lib/auth/types";

const PERGUNTA_COM_TEMPO = {
  indicadores: ["negocio.quantidade"],
  tempo: { campo: "negocio.criado_em", periodo: { atalho: "este_mes" } },
};
const grafico = (over: Partial<GraficoDoPainel> = {}): GraficoDoPainel => ({
  id: "g1",
  nome: "Negócios recebidos",
  descricao: "A descrição",
  tipo: "barra",
  layout: { x: 0, y: 0, w: 6, h: 4 },
  pergunta: PERGUNTA_COM_TEMPO,
  opcoes: {},
  ...over,
});
const RESULTADO = {
  colunas: [{ chave: "i0", nome: "Q", papel: "indicador", unidade: "contagem" }],
  linhas: [{ i0: 3 }],
  truncado: false,
  duracaoMs: 1,
  avisos: [],
  ignorados: [],
};

function montar(g: GraficoDoPainel, papel: Role = "manager", total = 3) {
  return render(
    <CardDoGrafico grafico={g} filtro={FILTRO_PADRAO} rodadaDoPainel={0} intervalo={null} papel={papel} painelId="p1" total={total} />,
  );
}
const consultaCom = (over: Record<string, unknown>) =>
  mocks.consulta.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.apareceu.valor = true;
  consultaCom({ data: RESULTADO });
});

describe("CardDoGrafico: estados", () => {
  it("antes de aparecer: sem título", () => {
    mocks.apareceu.valor = false;
    consultaCom({});
    montar(grafico());
    expect(screen.queryByText("Negócios recebidos")).toBeNull();
  });
  it("carregando: título, sem desenho", () => {
    consultaCom({ isLoading: true });
    montar(grafico());
    expect(screen.getByText("Negócios recebidos")).toBeTruthy();
    expect(screen.queryByTestId("desenho")).toBeNull();
  });
  it("pronto: desenha; o título leva a descrição como dica", () => {
    montar(grafico());
    expect(screen.getByTestId("desenho")).toBeTruthy();
    expect(screen.getByText("Negócios recebidos").getAttribute("title")).toBe("A descrição");
  });
  it("vazio com período: duas linhas em card alto, uma em card baixo", () => {
    consultaCom({ data: { ...RESULTADO, linhas: [] } });
    const { unmount } = montar(grafico());
    expect(screen.getByText("Nenhum resultado neste período.")).toBeTruthy();
    expect(screen.getByText("Tente um intervalo maior.")).toBeTruthy();
    unmount();
    montar(grafico({ layout: { x: 0, y: 0, w: 6, h: 2 } }));
    expect(screen.queryByText("Tente um intervalo maior.")).toBeNull();
  });
  it("vazio sem período: Sem dados", () => {
    consultaCom({ data: { ...RESULTADO, linhas: [] } });
    montar(grafico({ pergunta: { indicadores: ["negocio.quantidade"] } }));
    expect(screen.getByText("Sem dados")).toBeTruthy();
  });
  it("erro e consulta que demorou", () => {
    consultaCom({ isError: true, error: new Error("x") });
    const { unmount } = montar(grafico());
    expect(screen.getByText("Ops, ocorreu um erro inesperado")).toBeTruthy();
    expect(screen.getByText("Entre em contato com suporte se esse problema persistir")).toBeTruthy();
    unmount();
  });
  it("moedas diferentes e tipo desconhecido", () => {
    consultaCom({ data: { ...RESULTADO, avisos: ["moedas_diferentes"] } });
    const { unmount } = montar(grafico());
    expect(screen.getByText("Não foi possível calcular a soma dos valores.")).toBeTruthy();
    unmount();
    montar(grafico({ tipo: "radar" }));
    expect(screen.getByText("Tipo de gráfico não suportado.")).toBeTruthy();
  });
});

describe("CardDoGrafico: menu", () => {
  async function abrirMenu(papel: Role = "manager", total = 3) {
    const user = userEvent.setup();
    montar(grafico(), papel, total);
    await user.click(screen.getByRole("button", { name: "Opções do chart" }));
    return user;
  }
  it("gerente vê as cinco ações; agente só Exportar e Recarregar", async () => {
    await abrirMenu("manager");
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Exportar dados em CSV",
      "Editar",
      "Duplicar",
      "Recarregar",
      "Excluir",
    ]);
  });
  it("agente", async () => {
    await abrirMenu("agent");
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Exportar dados em CSV", "Recarregar"]);
  });
  it("com 30 gráficos, Duplicar fica desligado", async () => {
    await abrirMenu("manager", 30);
    expect(screen.getByRole("menuitem", { name: "Duplicar" }).getAttribute("aria-disabled")).toBe("true");
  });
  it("Editar navega; Duplicar chama a ação", async () => {
    const user = await abrirMenu();
    await user.click(screen.getByRole("menuitem", { name: "Editar" }));
    expect(mocks.push).toHaveBeenCalledWith("/app/metrics/explorar/g1");
    await user.click(screen.getByRole("button", { name: "Opções do chart" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicar" }));
    expect(mocks.duplicar).toHaveBeenCalledWith("g1", expect.anything());
  });
  it("Recarregar refaz a consulta com a rodada somada", async () => {
    const user = await abrirMenu();
    const antes = mocks.consulta.mock.calls.at(-1)?.[0].rodada;
    await user.click(screen.getByRole("menuitem", { name: "Recarregar" }));
    expect(mocks.consulta.mock.calls.at(-1)?.[0].rodada).toBe(antes + 1);
  });
  it("Excluir pede confirmação e confirma", async () => {
    const user = await abrirMenu();
    await user.click(screen.getByRole("menuitem", { name: "Excluir" }));
    expect(screen.getByText("Tem certeza que deseja excluir o chart?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(mocks.excluir).toHaveBeenCalledWith("g1", expect.anything());
  });
  it("Exportar baixa o CSV com o nome certo e avisa; truncado avisa diferente", async () => {
    mocks.post.mockResolvedValue({ data: RESULTADO });
    const user = await abrirMenu();
    await user.click(screen.getByRole("menuitem", { name: "Exportar dados em CSV" }));
    await waitFor(() => expect(mocks.baixarCsv).toHaveBeenCalled());
    expect(mocks.baixarCsv.mock.calls[0]?.[0]).toMatch(/^Negócios recebidos - \d{2}-\d{2}-\d{4}\.csv$/);
    expect(mocks.post.mock.calls[0]?.[1]).toMatchObject({ fresco: true, pergunta: { limite: 5000 } });
    expect(mocks.sucesso).toHaveBeenCalledWith("Exportação concluída com sucesso!");

    mocks.post.mockResolvedValue({ data: { ...RESULTADO, truncado: true } });
    await user.click(screen.getByRole("button", { name: "Opções do chart" }));
    await user.click(screen.getByRole("menuitem", { name: "Exportar dados em CSV" }));
    await waitFor(() => expect(mocks.sucesso).toHaveBeenCalledWith("Exportados os primeiros 5.000 registros."));
  });
});
