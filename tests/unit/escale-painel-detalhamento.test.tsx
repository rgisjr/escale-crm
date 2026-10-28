import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  detalhamento: vi.fn(),
  pedirCsv: vi.fn(),
  baixarCsv: vi.fn(),
  sucesso: vi.fn(),
  erro: vi.fn(),
  consulta: vi.fn(),
}));

vi.mock("@/hooks/escale/useDetalhamento", () => ({
  useDetalhamento: mocks.detalhamento,
  pedirCsvDoDetalhamento: mocks.pedirCsv,
}));
vi.mock("@/lib/escale/exportar/baixar", () => ({ baixarCsv: mocks.baixarCsv }));
vi.mock("sonner", () => ({ toast: { success: mocks.sucesso, error: mocks.erro } }));
vi.mock("@/hooks/escale/useResultadoDoGrafico", () => ({ useResultadoDoGrafico: mocks.consulta }));
vi.mock("@/hooks/escale/useApareceuNaTela", () => ({ useApareceuNaTela: () => ({ ref: () => {}, apareceu: true }) }));
vi.mock("@/hooks/escale/useGraficosDoPainel", () => ({
  useAcoesDosGraficos: () => ({ duplicar: { mutate: vi.fn() }, excluir: { mutate: vi.fn(), isPending: false } }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/escale/useCatalogoDeIndicadores", () => ({
  useCatalogoDeIndicadores: () => ({
    data: {
      assuntos: [
        {
          id: "negocio",
          nome: "Negócio",
          medidas: [
            { id: "negocio.quantidade", nome: "Quantidade", unidade: "contagem", descricao: "Quantos negócios.", temDetalhe: true },
            { id: "negocio.taxa_de_conversao", nome: "Taxa", unidade: "percentual", descricao: "", temDetalhe: false },
          ],
          colunasDoDetalhamento: [
            { chave: "id", nome: "ID do negócio", formato: null },
            { chave: "valor", nome: "Valor", formato: "valor" },
            { chave: "criado_em", nome: "Data de criação", formato: "data" },
          ],
        },
      ],
    },
  }),
}));
vi.mock("@/components/escale/indicadores/graficos/DesenhoDoGrafico", () => ({
  DesenhoDoGrafico: ({ aoClicarNoPonto }: { aoClicarNoPonto?: (c: object) => void }) => (
    <button data-testid="desenho" onClick={() => aoClicarNoPonto?.({ rotulo: "a" })} />
  ),
}));

import { CardDoGrafico } from "@/components/escale/indicadores/painel/CardDoGrafico";
import { JanelaDeDetalhamento, type AlvoDoDetalhamento } from "@/components/escale/indicadores/painel/JanelaDeDetalhamento";
import { FILTRO_PADRAO } from "@/lib/escale/indicadores/painel/filtro";
import type { GraficoDoPainel } from "@/lib/escale/indicadores/graficos/tipos";
import { ApiError } from "@/lib/api/types";
import { perguntaSchema } from "@/lib/escale/indicadores/pergunta";

const PERGUNTA = { indicadores: ["negocio.quantidade"], variaveis: ["negocio.origem"] };
const RESULTADO = {
  colunas: [
    { chave: "v0", nome: "Origem", papel: "variavel" },
    { chave: "i0", nome: "Negócio Quantidade", papel: "indicador", unidade: "contagem" },
  ],
  linhas: [{ v0: "a", v0_rotulo: "a", i0: 41 }],
  truncado: false,
  duracaoMs: 1,
  avisos: [],
  ignorados: [],
};
const grafico = (over: Partial<GraficoDoPainel> = {}): GraficoDoPainel => ({
  id: "g1",
  nome: "Meu gráfico",
  descricao: null,
  tipo: "barra",
  layout: { x: 0, y: 0, w: 6, h: 4 },
  pergunta: PERGUNTA,
  opcoes: {},
  ...over,
});
const montar = (g: GraficoDoPainel) =>
  render(<CardDoGrafico grafico={g} filtro={FILTRO_PADRAO} rodadaDoPainel={0} intervalo={null} papel="agent" painelId="p1" total={1} />);

const linhas = Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, valor: 1500, criado_em: "2026-09-28T16:56:00Z" }));
const respostaPadrao = {
  colunas: [
    { chave: "id", nome: "ID do negócio", formato: null },
    { chave: "valor", nome: "Valor", formato: "valor" },
    { chave: "criado_em", nome: "Data de criação", formato: "data" },
  ],
  linhas,
  total: 41,
  teto: false,
  pagina: 1,
  porPagina: 10,
  fuso: "America/Sao_Paulo",
};
const alvo = (): AlvoDoDetalhamento => ({
  graficoId: "g1",
  nomeDoGrafico: "Meu gráfico",
  indicadorId: "negocio.quantidade",
  nomeDoIndicador: "Quantidade",
  descricaoDoIndicador: "Quantos negócios.",
  valor: "41",
  pergunta: perguntaSchema.parse(PERGUNTA),
  filtroDoPainel: FILTRO_PADRAO,
  ponto: { variaveis: [] },
  colunas: [
    { chave: "id", nome: "ID do negócio", padrao: true },
    { chave: "valor", nome: "Valor", formato: "valor", padrao: true },
    { chave: "criado_em", nome: "Data de criação", formato: "data", padrao: true },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mocks.detalhamento.mockReturnValue({ data: respostaPadrao, isError: false, error: null, refetch: vi.fn() });
  mocks.consulta.mockReturnValue({ data: RESULTADO, isLoading: false, isError: false, error: null });
});

describe("JanelaDeDetalhamento", () => {
  it("mostra o indicador, o valor, as colunas, o total e os formatos BR", () => {
    render(<JanelaDeDetalhamento alvo={alvo()} aoFechar={vi.fn()} />);
    expect(screen.getAllByText("Quantidade").length).toBeGreaterThan(0);
    expect(screen.getByText("41")).toBeTruthy();
    expect(screen.getByText("Exportar .CSV")).toBeTruthy();
    expect(screen.getByText("Editar colunas")).toBeTruthy();
    expect(screen.getByText("41 itens")).toBeTruthy();
    expect(screen.getByText("ID do negócio")).toBeTruthy();
    expect(screen.getAllByText("R$ 1.500,00").length).toBe(10);
    expect(screen.getAllByText("28/09/2026, 13:56").length).toBe(10);
    expect(screen.getByText("10 por página")).toBeTruthy();
  });

  it("clicar no cabeçalho manda a ordem; trocar página manda a página", () => {
    render(<JanelaDeDetalhamento alvo={alvo()} aoFechar={vi.fn()} />);
    fireEvent.click(screen.getByText("Valor"));
    expect(mocks.detalhamento.mock.calls.at(-1)?.[0].pedido.ordem).toEqual({ coluna: "valor", direcao: "asc" });
    fireEvent.click(screen.getByText("Próximo"));
    expect(mocks.detalhamento.mock.calls.at(-1)?.[0].pedido.pagina).toBe(2);
  });

  it("Editar colunas abre a lista com caixas; desmarcar tira a coluna do pedido", () => {
    render(<JanelaDeDetalhamento alvo={alvo()} aoFechar={vi.fn()} />);
    fireEvent.click(screen.getByText("Editar colunas"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Valor" }));
    expect(mocks.detalhamento.mock.calls.at(-1)?.[0].pedido.colunas).toEqual(["id", "criado_em"]);
  });

  it("Exportar .CSV baixa o arquivo e avisa; truncado avisa diferente", async () => {
    mocks.pedirCsv.mockResolvedValueOnce({ texto: "a,b", truncado: false });
    render(<JanelaDeDetalhamento alvo={alvo()} aoFechar={vi.fn()} />);
    fireEvent.click(screen.getByText("Exportar .CSV"));
    await waitFor(() => expect(mocks.baixarCsv).toHaveBeenCalled());
    expect(mocks.baixarCsv.mock.calls[0]?.[0]).toMatch(/^Meu gráfico - Quantidade - \d{2}-\d{2}-\d{4}\.csv$/);
    expect(mocks.sucesso).toHaveBeenCalledWith("Exportação concluída com sucesso!");
    mocks.pedirCsv.mockResolvedValueOnce({ texto: "a", truncado: true });
    fireEvent.click(screen.getByText("Exportar .CSV"));
    await waitFor(() => expect(mocks.sucesso).toHaveBeenCalledWith("Exportados os primeiros 20.000 registros."));
    mocks.pedirCsv.mockRejectedValueOnce(new Error("x"));
    fireEvent.click(screen.getByText("Exportar .CSV"));
    await waitFor(() => expect(mocks.erro).toHaveBeenCalledWith("Erro ao exportar dados"));
  });

  it("estados: sem linhas, teto e métrica sem detalhamento", () => {
    mocks.detalhamento.mockReturnValue({ data: { ...respostaPadrao, linhas: [], total: 0 }, isError: false, error: null });
    const { unmount } = render(<JanelaDeDetalhamento alvo={alvo()} aoFechar={vi.fn()} />);
    expect(screen.getByText("Nenhum registro encontrado para esse detalhamento.")).toBeTruthy();
    unmount();
    mocks.detalhamento.mockReturnValue({ data: { ...respostaPadrao, total: 10001, teto: true }, isError: false, error: null });
    const outra = render(<JanelaDeDetalhamento alvo={alvo()} aoFechar={vi.fn()} />);
    expect(screen.getByText("10.000+ itens")).toBeTruthy();
    outra.unmount();
    const erro = Object.assign(new Error("x"), { status: 422 });
    Object.setPrototypeOf(erro, ApiError.prototype);
    mocks.detalhamento.mockReturnValue({ data: undefined, isError: true, error: erro, refetch: vi.fn() });
    render(<JanelaDeDetalhamento alvo={alvo()} aoFechar={vi.fn()} />);
    expect(screen.getByText("Essa métrica ainda não suporta detalhamento.")).toBeTruthy();
  });
});

describe("CardDoGrafico com detalhamento", () => {
  it("mostra 'Ver detalhamento' e abre a janela com o total", () => {
    montar(grafico());
    fireEvent.click(screen.getByLabelText("Ver detalhamento"));
    expect(screen.getByText("41 itens")).toBeTruthy();
  });

  it("clicar no desenho abre a janela com o valor do ponto", () => {
    montar(grafico());
    fireEvent.click(screen.getByTestId("desenho"));
    expect(mocks.detalhamento.mock.calls.at(-1)?.[0].pedido.ponto.variaveis[0]).toEqual({ id: "negocio.origem", valor: "a" });
  });

  it("indicador sem detalhe não mostra o ícone", () => {
    montar(grafico({ pergunta: { indicadores: ["negocio.taxa_de_conversao"] } }));
    expect(screen.queryByLabelText("Ver detalhamento")).toBeNull();
  });

  it("divisor não consulta nem mostra data, detalhamento e título duplicado", () => {
    montar(grafico({ tipo: "divisor", pergunta: { divisor: true } }));
    expect(screen.queryByLabelText("Ver detalhamento")).toBeNull();
    expect(screen.getAllByText("Meu gráfico").length).toBe(1);
    expect(mocks.consulta.mock.calls.at(-1)?.[0].ligado).toBe(false);
  });
});
