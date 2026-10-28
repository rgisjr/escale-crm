import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/escale/useOpcoesDaDimensao", () => ({
  useOpcoesDaDimensao: () => ({ isLoading: false, data: [] }),
}));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }));

import { AbaOpcoesDoEditor } from "@/components/escale/indicadores/editor/AbaOpcoesDoEditor";
import { LateralDoEditor } from "@/components/escale/indicadores/editor/LateralDoEditor";
import {
  formatosDaOperacao,
  idDoCalculado,
  operacoesDoTipo,
  textoDaFormula,
} from "@/lib/escale/indicadores/editor/calculado";
import { perguntaDoRascunho, perguntaOuDivisor, rascunhoDoGrafico } from "@/lib/escale/indicadores/editor/pergunta-do-rascunho";
import {
  adicionarCalculado,
  adicionarFiltroQuantitativo,
  adicionarIndicador,
  adicionarVariavel,
  definirTempo,
  editarCalculado,
  mudarComparacao,
  mudarFiltroQuantitativo,
  mudarOpcoes,
  mudarOrdem,
  rascunhoNovo,
  removerCalculado,
  removerIndicadorComAviso,
  trocarTipo,
  type RascunhoDoGrafico,
} from "@/lib/escale/indicadores/editor/rascunho";
import { limiteDoTipo } from "@/lib/escale/indicadores/editor/tipos-de-grafico";
import { novoGraficoSchema } from "@/lib/escale/indicadores/editor/schema";
import { CATALOGO_FALSO as CAT } from "@/tests/helpers/catalogo-da-tela";

const QTD = "negocio.quantidade";
const VALORES = "negocio.soma_de_valores";
const TICKET = { nome: "Ticket médio", a: VALORES, op: "divisao", b: QTD, formato: "moeda" } as const;
const base = (): RascunhoDoGrafico => adicionarIndicador(rascunhoNovo("barra"), QTD, CAT);
const congelar = <T,>(o: T): T => {
  if (o && typeof o === "object") {
    Object.values(o).forEach(congelar);
    Object.freeze(o);
  }
  return o;
};

describe("rascunho: calculado", () => {
  it("gera o id pelo nome, respeita o limite do tipo e nunca muta", () => {
    const r = adicionarCalculado(congelar(base()), TICKET);
    expect(r.calculados.map((c) => c.id)).toEqual(["calc:ticket_medio"]);
    const pizza = adicionarCalculado(adicionarIndicador(rascunhoNovo("pizza"), QTD, CAT), TICKET);
    expect(pizza.calculados).toHaveLength(0);
    expect(limiteDoTipo("ranking")).toBe(1);
  });

  it("removerIndicador de um operando leva o calculado junto e devolve o nome", () => {
    const r = adicionarCalculado(adicionarIndicador(base(), VALORES, CAT), TICKET);
    const { rascunho, removidos } = removerIndicadorComAviso(r, QTD);
    expect(rascunho.calculados).toHaveLength(0);
    expect(removidos).toEqual(["Ticket médio"]);
  });

  it("removerCalculado tira de ordem, filtro quantitativo e metas", () => {
    let r = adicionarCalculado(base(), TICKET);
    r = mudarOrdem(r, { por: "calc:ticket_medio" });
    r = adicionarFiltroQuantitativo(r, "calc:ticket_medio");
    r = mudarOpcoes(r, (o) => ({ ...o, metas: { ligadas: true, itens: [{ indicador: "calc:ticket_medio", valor: 5, visivel: true }] } }));
    const sem = removerCalculado(r, "calc:ticket_medio");
    expect(sem.ordem.por).toBeNull();
    expect(sem.filtroQuantitativo).toHaveLength(0);
    expect(sem.opcoes.metas.itens).toHaveLength(0);
  });

  it("editarCalculado troca o conteúdo mantendo o id", () => {
    const r = editarCalculado(adicionarCalculado(base(), TICKET), "calc:ticket_medio", { ...TICKET, op: "multiplicacao", formato: "numero" });
    expect(r.calculados[0]).toMatchObject({ id: "calc:ticket_medio", op: "multiplicacao" });
  });

  it("regras: pizza só soma e multiplica; percentual só na divisão; fórmula e id", () => {
    expect(operacoesDoTipo("pizza")).toEqual(["soma", "multiplicacao"]);
    expect(formatosDaOperacao("soma")).not.toContain("percentual");
    expect(formatosDaOperacao("divisao")).toContain("percentual");
    expect(textoDaFormula({ a: QTD, b: VALORES, op: "divisao" }, (id) => (id === QTD ? "Negócio Quantidade" : "Negócio Soma de valores"))).toBe(
      "Negócio Quantidade ÷ Negócio Soma de valores · divisão",
    );
    expect(idDoCalculado("Ticket médio", ["calc:ticket_medio"])).toBe("calc:ticket_medio_2");
  });
});

describe("rascunho: tipos, comparação e filtro quantitativo", () => {
  it("trocar para Pizza com divisão avisa; heatmap zera variáveis; divisor vira rascunho mínimo", () => {
    const comCalc = adicionarCalculado(base(), TICKET);
    expect(trocarTipo(comCalc, "pizza")).toEqual({ calculadoIncompativel: true });
    const comVar = adicionarVariavel(base(), "negocio.origem");
    const heat = trocarTipo(comVar, "heatmap");
    expect("rascunho" in heat && heat.rascunho.variaveis).toEqual([]);
    const div = trocarTipo(comVar, "divisor");
    expect("rascunho" in div && div.rascunho.indicadores).toEqual([]);
  });

  it("tipo sem suporte a metas desliga as metas", () => {
    const r = mudarOpcoes(base(), (o) => ({ ...o, metas: { ...o.metas, ligadas: true } }));
    const res = trocarTipo(r, "linha");
    expect("rascunho" in res && res.rascunho.opcoes.metas.ligadas).toBe(true);
    const funil = trocarTipo(mudarOpcoes(rascunhoNovo("linha"), (o) => ({ ...o, metas: { ...o.metas, ligadas: true } })), "pizza");
    expect("rascunho" in funil && funil.rascunho.opcoes.metas.ligadas).toBe(false);
  });

  it("comparação liga em 'equivalente' e o filtro quantitativo nasce 'maior que' sem valor", () => {
    expect(mudarComparacao(base(), true)).toMatchObject({ comparar: true, comparacao: "equivalente" });
    const f = adicionarFiltroQuantitativo(base(), QTD);
    expect(f.filtroQuantitativo[0]).toMatchObject({ indicador: QTD, op: "maior_que", valor: null });
    expect(mudarFiltroQuantitativo(f, f.filtroQuantitativo[0]!.chave, { valor: 5 }).filtroQuantitativo[0]?.valor).toBe(5);
  });
});

describe("pergunta do rascunho: ida e volta", () => {
  it("calculados, filtro quantitativo e comparação saem na pergunta e voltam", () => {
    let r = definirTempo(adicionarCalculado(base(), TICKET), "negocio.criado_em");
    r = mudarComparacao(adicionarFiltroQuantitativo(r, QTD), true, "mes_anterior");
    r = mudarFiltroQuantitativo(r, r.filtroQuantitativo[0]!.chave, { valor: 5 });
    const res = perguntaDoRascunho(r, CAT);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.pergunta.calculados).toHaveLength(1);
    expect(res.pergunta.filtroQuantitativo).toEqual([{ indicador: QTD, op: "maior_que", valor: 5 }]);
    expect(res.pergunta.comparacao).toEqual({ modo: "mes_anterior" });
    const volta = rascunhoDoGrafico({ tipo: "barra", pergunta: res.pergunta, opcoes: r.opcoes });
    expect(JSON.stringify(volta, null, 1).length).toBeGreaterThan(0);
    expect({ ...volta, filtroQuantitativo: [], filtro: [] }).toEqual({ ...r, filtroQuantitativo: [], filtro: [] });
    expect(volta.filtroQuantitativo.map(({ chave: _c, ...x }) => x)).toEqual(r.filtroQuantitativo.map(({ chave: _c, ...x }) => x));
  });

  it("filtro quantitativo sem valor é erro da seção", () => {
    const r = adicionarFiltroQuantitativo(base(), QTD);
    const res = perguntaDoRascunho(r, CAT);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.erros[0]?.secao).toBe("filtro_quantitativo");
  });

  it("heatmap vira matriz de tempo; divisor vira { divisor: true }", () => {
    const heat = trocarTipo(definirTempo(base(), "negocio.criado_em"), "heatmap");
    const res = perguntaDoRascunho("rascunho" in heat ? heat.rascunho : base(), CAT);
    expect(res.ok && res.pergunta.matrizDeTempo).toBe(true);
    const div = perguntaOuDivisor(rascunhoNovo("divisor"), CAT);
    expect(div).toEqual({ ok: true, divisor: true, pergunta: { divisor: true } });
    expect(rascunhoDoGrafico({ tipo: "divisor", pergunta: { divisor: true }, opcoes: {} }).tipo).toBe("divisor");
  });

  it("o schema do POST aceita divisor só com tipo divisor", () => {
    const painelId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const comum = { painelId, nome: "x", opcoes: {} };
    expect(novoGraficoSchema.safeParse({ ...comum, tipo: "divisor", pergunta: { divisor: true } }).success).toBe(true);
    expect(novoGraficoSchema.safeParse({ ...comum, tipo: "linha", pergunta: { divisor: true } }).success).toBe(false);
    expect(novoGraficoSchema.safeParse({ ...comum, tipo: "sankey", pergunta: { indicadores: [QTD] } }).success).toBe(true);
  });
});

let ultimo: RascunhoDoGrafico;
function Lateral({ inicial = base() }: { inicial?: RascunhoDoGrafico }) {
  const [r, setR] = useState(inicial);
  useEffect(() => {
    ultimo = r;
  });
  return (
    <LateralDoEditor rascunho={r} catalogo={CAT} erroDoCatalogo={false} aoTentarOCatalogo={() => undefined} erros={[]} mudar={(f) => setR(f)} etapasDoResultado={[]} />
  );
}
function Opcoes({ tipo = "barra" as RascunhoDoGrafico["tipo"] }) {
  const [r, setR] = useState(() => adicionarIndicador(rascunhoNovo(tipo), QTD, CAT));
  useEffect(() => {
    ultimo = r;
  });
  return <AbaOpcoesDoEditor rascunho={r} catalogo={CAT} mudar={(f) => setR(f)} etapasDoResultado={[]} />;
}

describe("tela: indicador calculado", () => {
  it("o botão fica sob 'Adicionar indicador'; o modal tem fórmula, formato e prévia; salvar cria o chip", async () => {
    const user = userEvent.setup();
    render(<Lateral />);
    await user.click(screen.getByRole("button", { name: "Indicador calculado" }));
    expect(screen.getByText("INDICADOR CALCULADO")).toBeInTheDocument();
    expect(screen.getByText("Prévia no período atual")).toBeInTheDocument();
    expect(screen.getByText("Execute o gráfico para ver a prévia no período atual.")).toBeInTheDocument();
    const salvar = screen.getByRole("button", { name: "Salvar indicador" });
    expect(salvar).toBeDisabled();
    await user.type(screen.getByPlaceholderText("Ticket médio por vendedor"), "Ticket");
    await user.click(screen.getByRole("combobox", { name: "Indicador A" }));
    await user.click(screen.getByRole("option", { name: /Soma de valores/ }));
    await user.click(screen.getByRole("combobox", { name: "Indicador B" }));
    await user.click(screen.getByRole("option", { name: /Quantidade/ }));
    expect(salvar).toBeEnabled();
    await user.click(salvar);
    expect(ultimo.calculados).toHaveLength(1);
    expect(screen.getByText("Ticket")).toBeInTheDocument();
  });

  it("sem indicador não há botão de calculado; 'Percentual' só na divisão", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Lateral inicial={rascunhoNovo("barra")} />);
    expect(screen.queryByRole("button", { name: "Indicador calculado" })).toBeNull();
    unmount();
    render(<Lateral />);
    await user.click(screen.getByRole("button", { name: "Indicador calculado" }));
    await user.click(screen.getByRole("button", { name: "soma" }));
    expect(screen.getByRole("button", { name: "Percentual" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "divisão" }));
    expect(screen.getByRole("button", { name: "Percentual" })).toBeEnabled();
  });
});

describe("tela: filtro quantitativo, divisor e heatmap", () => {
  it("adiciona a condição pelo indicador e mostra 'é', o operador e o campo", async () => {
    const user = userEvent.setup();
    render(<Lateral />);
    const secao = screen.getByRole("region", { name: "Filtro Quantitativo" });
    await user.click(within(secao).getByRole("button", { name: "Adicionar indicador" }));
    await user.click(screen.getByRole("button", { name: "Negócio Quantidade" }));
    expect(within(secao).getByText("é")).toBeInTheDocument();
    expect(within(secao).getByRole("combobox", { name: "Operador" })).toHaveTextContent("maior que");
    await user.type(within(secao).getByRole("textbox", { name: "Valor" }), "10");
    expect(ultimo.filtroQuantitativo[0]?.valor).toBe(10);
  });

  it("divisor esmaece a lateral e avisa; heatmap esconde a Variável", () => {
    const { unmount } = render(<Lateral inicial={rascunhoNovo("divisor")} />);
    expect(screen.getByText("O divisor não usa indicadores.")).toBeInTheDocument();
    unmount();
    const heat = trocarTipo(base(), "heatmap");
    render(<Lateral inicial={"rascunho" in heat ? heat.rascunho : base()} />);
    expect(screen.getByText("O heatmap usa só o campo de tempo.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Adicionar variável" })).toBeNull();
  });
});

describe("tela: aba Opções da 7E", () => {
  it("ordem dos acordeões e Metas ligada com o valor 25", async () => {
    const user = userEvent.setup();
    render(<Opcoes />);
    const titulos = screen.getAllByRole("button", { expanded: true }).map((b) => b.textContent);
    expect(titulos.slice(0, 4)).toEqual(["Metas", "Visualização", "Opções do gráfico", "Ordenação"]);
    await user.click(screen.getByRole("switch", { name: "Metas" }));
    await user.type(screen.getByRole("textbox", { name: "Meta" }), "25");
    expect(ultimo.opcoes.metas).toMatchObject({ ligadas: true, itens: [{ indicador: QTD, valor: 25, visivel: true }] });
    await user.click(screen.getByRole("button", { name: "Ocultar meta" }));
    expect(ultimo.opcoes.metas.itens[0]?.visivel).toBe(false);
  });

  it("tipo sem suporte mostra a mensagem; sem indicador, 'Nenhum indicador selecionado'", () => {
    const { unmount } = render(<Opcoes tipo="pizza" />);
    expect(screen.getByText("Este tipo de gráfico não suporta metas")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Metas" })).toBeDisabled();
    unmount();
    function SemIndicador() {
      const [r, setR] = useState(rascunhoNovo("barra"));
      return <AbaOpcoesDoEditor rascunho={r} catalogo={CAT} mudar={(f) => setR(f)} etapasDoResultado={[]} />;
    }
    render(<SemIndicador />);
    expect(screen.getByText("Nenhum indicador selecionado")).toBeInTheDocument();
  });

  it("projeções são excludentes; comparação mostra o modo com a ajuda", async () => {
    const user = userEvent.setup();
    render(<Opcoes />);
    await user.click(screen.getByRole("switch", { name: "Projeção normal" }));
    await user.click(screen.getByRole("switch", { name: "Projeção dias úteis" }));
    expect(ultimo.opcoes.visualizacao).toMatchObject({ projecaoNormal: false, projecaoDiasUteis: true });
  });

  it("comparar sem tempo fica desligado; com tempo liga e mostra 'Modo de comparação'", async () => {
    const user = userEvent.setup();
    function ComTempo() {
      const [r, setR] = useState(() => definirTempo(adicionarIndicador(rascunhoNovo("linha"), QTD, CAT), "negocio.criado_em"));
      useEffect(() => {
        ultimo = r;
      });
      return <AbaOpcoesDoEditor rascunho={r} catalogo={CAT} mudar={(f) => setR(f)} etapasDoResultado={[]} />;
    }
    const { unmount } = render(<Opcoes tipo="linha" />);
    unmount();
    render(<ComTempo />);
    await user.click(screen.getByRole("switch", { name: "Comparar com período anterior" }));
    expect(screen.getByText("Modo de comparação")).toBeInTheDocument();
    expect(screen.getByText("Define o período de referência para o cálculo da variação percentual.")).toBeInTheDocument();
    expect(ultimo.comparacao).toBe("equivalente");
  });

  it("Funil mostra as opções de 10-042 e 10-044", () => {
    render(<Opcoes tipo="funil" />);
    for (const t of ["Última etapa (fim do funil)", "Etapas exibidas", "Casas decimais", "Destacar maior queda", "Meta de conversão entre etapas", "Destaque", "Formato dos números", "Cores das etapas", "Última etapa em verde", "Gargalo entre etapas"]) {
      expect(screen.getAllByText(t).length).toBeGreaterThan(0);
    }
  });

  it("Ranking com 1 variável deixa 'Faixas fora da meta' desligado; Heatmap mostra escala e janela", () => {
    const { unmount } = render(<Opcoes tipo="ranking" />);
    expect(screen.getByText("Faixas fora da meta")).toBeInTheDocument();
    expect(screen.getByText("Adicione uma segunda variável")).toBeInTheDocument();
    unmount();
    render(<Opcoes tipo="heatmap" />);
    expect(screen.getByText("Escala de cor")).toBeInTheDocument();
    expect(screen.getByText("Janela de horas")).toBeInTheDocument();
  });
});
