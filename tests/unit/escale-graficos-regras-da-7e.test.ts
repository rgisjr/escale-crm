import { describe, expect, it } from "vitest";

import { alinharComparacao, variacaoPercentual } from "@/lib/escale/indicadores/graficos/comparacao";
import { coresDoFunil, corDoAvatar, escalaDoHeatmap } from "@/lib/escale/indicadores/graficos/cores";
import { dadosCartesianos, etapasDoFunil, linhasDaTabela } from "@/lib/escale/indicadores/graficos/dados";
import {
  celulasDoHeatmap,
  fluxoDoSankey,
  linhasDoRanking,
  numeroAvancado,
  pilhas100,
} from "@/lib/escale/indicadores/graficos/dados-avancados";
import {
  colunasGuardadas,
  csvDoDetalhamento,
  nomeDoCsvDoDetalhamento,
  pontoDoClique,
} from "@/lib/escale/indicadores/graficos/detalhamento";
import { formatarCompacto, formatarPercentual, formatarVariacao } from "@/lib/escale/indicadores/graficos/formatos";
import { atingiu, faixaDeSaude, metaDoIndicador, percentualDaMeta } from "@/lib/escale/indicadores/graficos/metas";
import { opcoesComPadrao } from "@/lib/escale/indicadores/graficos/opcoes";
import { diasUteisEntre, projetar } from "@/lib/escale/indicadores/graficos/projecao";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import { perguntaSchema } from "@/lib/escale/indicadores/pergunta";

type Papel = "variavel" | "tempo" | "indicador" | "rotulo";
const col = (chave: string, papel: Papel, extra: Record<string, unknown> = {}) => ({ chave, nome: chave, papel, ...extra });
const resultado = (colunas: ReturnType<typeof col>[], linhas: Record<string, unknown>[], extra: Partial<Resultado> = {}): Resultado =>
  ({ colunas, linhas, truncado: false, duracaoMs: 1, avisos: [], ignorados: [], ...extra }) as Resultado;
const O = (o: unknown = {}) => opcoesComPadrao(o);

describe("opções com padrão", () => {
  it("traz os padrões da 7E", () => {
    const o = O();
    expect(o.metas).toEqual({ ligadas: false, itens: [] });
    expect(o.funil.cores).toBe("por_etapa");
    expect(o.heatmap.escala).toBe("linear");
    expect(o.barra100.formato).toBe("resumo");
    expect(o.numeroAvancado.faixas).toEqual({ saudavel: 100, alerta: 70 });
    expect(o.visualizacao.projecaoNormal).toBe(false);
  });
});

describe("metas", () => {
  it("só existem com as metas ligadas", () => {
    const itens = [{ indicador: "i0", valor: 25, visivel: true }];
    expect(metaDoIndicador(O({ metas: { ligadas: false, itens } }), "i0")).toBeNull();
    expect(metaDoIndicador(O({ metas: { ligadas: true, itens } }), "i0")).toEqual({ valor: 25, visivel: true });
  });
  it("percentual, atingiu e faixas de saúde", () => {
    expect(percentualDaMeta(34, 25)).toBe(136);
    expect(percentualDaMeta(1, 0)).toBeNull();
    expect(atingiu(25, 25)).toBe(true);
    const f = { saudavel: 100, alerta: 70 };
    expect(faixaDeSaude(136, f)).toBe("saudavel");
    expect(faixaDeSaude(80, f)).toBe("alerta");
    expect(faixaDeSaude(50, f)).toBe("critico");
    expect(faixaDeSaude(null, f)).toBeNull();
  });
});

describe("comparação", () => {
  it("variação percentual", () => {
    expect(variacaoPercentual(112, 100)).toBe(12);
    expect(variacaoPercentual(10, 0)).toBeNull();
    expect(variacaoPercentual(10, null)).toBeNull();
  });
  it("alinha por índice com tempo e por chave sem tempo", () => {
    const cols = [col("t", "tempo"), col("i0", "indicador", { unidade: "contagem" })];
    const r = resultado(cols, [], { comparacao: { periodo: { de: "a", ate: "b" }, truncado: false, linhas: [{ t: "2026-09-02T00:00:00", i0: 2 }, { t: "2026-09-01T00:00:00", i0: 1 }] } });
    expect(alinharComparacao(r)?.anteriorPorIndice.get(0)).toMatchObject({ i0: 1 });
    const sem = resultado([col("v0", "variavel"), col("i0", "indicador")], [], { comparacao: { periodo: { de: "a", ate: "b" }, truncado: false, linhas: [{ v0: "x", i0: 5 }] } });
    expect(alinharComparacao(sem)?.anteriorPorChave.get("x|")).toMatchObject({ i0: 5 });
    expect(alinharComparacao(resultado(cols, []))).toBeNull();
  });
  it("dadosCartesianos acrescenta a série tracejada do período anterior", () => {
    const r = resultado(
      [col("t", "tempo"), col("i0", "indicador", { nome: "Ganhos", unidade: "contagem" })],
      [{ t: "2026-10-01T00:00:00", i0: 3 }, { t: "2026-10-02T00:00:00", i0: 4 }],
      { comparacao: { periodo: { de: "a", ate: "b" }, truncado: false, linhas: [{ t: "2026-09-01T00:00:00", i0: 1 }, { t: "2026-09-02T00:00:00", i0: 2 }] } },
    );
    const d = dadosCartesianos(r, "dia", "linha", { opcoes: O() });
    const anterior = d.series.find((s) => s.tracejada);
    expect(anterior?.nome).toBe("Ganhos (Período anterior)");
    expect(d.pontos.map((p) => p[anterior?.chave ?? ""])).toEqual([1, 2]);
  });
});

describe("projeção", () => {
  const r = (periodo: Resultado["periodo"], unidade = "contagem") =>
    resultado([col("t", "tempo"), col("i0", "indicador", { unidade })], [{ t: "2026-10-01T00:00:00", i0: 150 }], { periodo });
  const P = { de: "2026-10-01", ate: "2026-10-31", hoje: "2026-10-15" };
  it("diasUteisEntre", () => expect(diasUteisEntre("2026-10-26", "2026-11-01")).toBe(5));
  it("normal: ritmo 10 por dia, total 310 e buckets de 16 a 31", () => {
    const p = projetar(r(P), { chave: "i0", unidade: "contagem" }, "normal");
    expect(p?.porBucket).toBe(10);
    expect(p?.total).toBe(310);
    expect(p?.buckets).toHaveLength(16);
    expect(p?.buckets[0]).toEqual({ t: "2026-10-16T00:00:00", valor: 10 });
  });
  it("dias úteis: fim de semana vale 0", () => {
    const p = projetar(r(P), { chave: "i0", unidade: "contagem" }, "dias_uteis");
    const sabado = p?.buckets.find((b) => b.t.startsWith("2026-10-17"));
    expect(sabado?.valor).toBe(0);
    expect(p?.total).toBeGreaterThan(0);
  });
  it("é null fora do período, com percentual ou sem período", () => {
    expect(projetar(r({ ...P, hoje: "2026-11-02" }), { chave: "i0", unidade: "contagem" }, "normal")).toBeNull();
    expect(projetar(r(P, "percentual"), { chave: "i0", unidade: "percentual" }, "normal")).toBeNull();
    expect(projetar(r(null), { chave: "i0", unidade: "contagem" }, "normal")).toBeNull();
  });
  it("dadosCartesianos põe a série Projeção só nos buckets futuros", () => {
    const rr = resultado(
      [col("t", "tempo"), col("i0", "indicador", { nome: "Ganhos", unidade: "contagem" })],
      [{ t: "2026-10-01T00:00:00", i0: 150 }],
      { periodo: P },
    );
    const d = dadosCartesianos(rr, "dia", "linha", { opcoes: O({ visualizacao: { projecaoNormal: true } }) });
    expect(d.series.at(-1)?.nome).toBe("Ganhos (Projeção)");
    expect(d.pontos.at(-1)).toMatchObject({ projecao: 10 });
    expect(d.pontos[0]).toMatchObject({ projecao: null });
  });
});

describe("dados dos tipos avançados", () => {
  const ranking = resultado(
    [col("v0", "variavel"), col("v1", "variavel"), col("i0", "indicador", { unidade: "contagem" })],
    [
      { v0: "Ana Lima", v1: "A", i0: 6 },
      { v0: "Ana Lima", v1: "B", i0: 4 },
      { v0: "Bruno", v1: "A", i0: 5 },
    ],
  );
  it("ranking ordena, calcula proporção e fora da meta", () => {
    const l = linhasDoRanking(ranking, O({ ranking: { faixasForaDaMeta: ["B"] } }));
    expect(l.map((x) => [x.nome, x.valor, x.iniciais])).toEqual([["Ana Lima", 10, "AL"], ["Bruno", 5, "BR"]]);
    expect(l[1]?.proporcao).toBe(0.5);
    expect(l[0]?.foraDaMeta).toBe(40);
    expect(linhasDoRanking(ranking, O())[0]?.foraDaMeta).toBeNull();
  });
  it("barra 100% normaliza cada X a 100", () => {
    const r = resultado([col("v0", "variavel"), col("i0", "indicador", { unidade: "contagem" })], [{ v0: "a", i0: 1 }, { v0: "b", i0: 3 }]);
    const d = pilhas100(r, O());
    expect(d.pontos).toHaveLength(1);
    expect(d.series.map((s) => d.pontos[0]?.[s.chave])).toEqual([25, 75]);
    const porData = pilhas100(
      resultado([col("t", "tempo"), col("v0", "variavel"), col("i0", "indicador", { unidade: "contagem" })], [
        { t: "2026-10-01T00:00:00", v0: "a", i0: 1 },
        { t: "2026-10-01T00:00:00", v0: "b", i0: 1 },
      ]),
      O({ barra100: { formato: "por_data" } }),
    );
    expect(porData.series.map((s) => porData.pontos[0]?.[s.chave])).toEqual([50, 50]);
  });
  it("número avançado junta variação, meta, faixa e projeção", () => {
    const r = resultado([col("i0", "indicador", { unidade: "contagem" })], [{ i0: 34 }], {
      comparacao: { periodo: { de: "a", ate: "b" }, truncado: false, linhas: [{ i0: 30 }] },
    });
    const n = numeroAvancado(r, O({ metas: { ligadas: true, itens: [{ indicador: "i0", valor: 25, visivel: true }] } }));
    expect(n.variacao).toBeCloseTo(13.33, 1);
    expect(n).toMatchObject({ valor: 34, anterior: 30, meta: 25, pctDaMeta: 136, faixa: "saudavel", projecao: null });
    expect(numeroAvancado(resultado([col("i0", "indicador")], [{ i0: 1 }]), O()).variacao).toBeNull();
  });
  it("heatmap: linear, percentil e janela comercial", () => {
    const linhas = [{ dsem: 1, hora: 3, i0: 1 }, { dsem: 1, hora: 9, i0: 12 }, { dsem: 2, hora: 10, i0: 6 }];
    const r = resultado([col("dsem", "tempo"), col("hora", "tempo"), col("i0", "indicador")], linhas);
    const linear = celulasDoHeatmap(r, O());
    expect(linear.maximo).toBe(12);
    expect(linear.celulas.map((c) => c.nivel)).toEqual([1, 4, 2]);
    expect(celulasDoHeatmap(r, O({ heatmap: { escala: "percentil" } })).celulas.map((c) => c.nivel)).toEqual([1, 3, 2]);
    const comercial = celulasDoHeatmap(r, O({ heatmap: { janela: "comercial" } }));
    expect(comercial.horas).toHaveLength(12);
    expect(comercial.celulas).toHaveLength(2);
  });
  it("sankey: null sem 2 variáveis, Outros acima de 12 nós e Vazio no nulo", () => {
    expect(fluxoDoSankey(resultado([col("v0", "variavel"), col("i0", "indicador")], [{ v0: "a", i0: 1 }]))).toBeNull();
    const dois = [col("v0", "variavel"), col("v1", "variavel"), col("i0", "indicador")];
    const muitos = Array.from({ length: 15 }, (_, i) => ({ v0: `o${i}`, v1: "x", i0: 15 - i }));
    const f = fluxoDoSankey(resultado(dois, muitos));
    expect(f?.nodes.some((n) => n.name === "Outros")).toBe(true);
    expect(f?.total).toBe(120);
    const vazio = fluxoDoSankey(resultado(dois, [{ v0: null, v1: "x", i0: 2 }, { v0: "a", v1: "x", i0: 0 }]));
    expect(vazio?.nodes.map((n) => n.name)).toEqual(["Vazio", "x"]);
    expect(vazio?.links).toHaveLength(1);
  });
});

describe("funil e tabela com as opções da 7E", () => {
  const r = resultado(
    [col("v0", "variavel"), col("i0", "indicador", { unidade: "contagem" })],
    [{ v0: "a", i0: 100 }, { v0: "b", i0: 40 }, { v0: "c", i0: 10 }, { v0: "d", i0: 5 }],
  );
  const f = (funil: object) => etapasDoFunil(r, O({ funil: { calculo: "primeira_etapa", ...funil } }).funil);
  it("etapas ocultas não entram no cálculo e a última etapa corta o fim", () => {
    expect(f({ etapasExibidas: ["a", "c"] }).map((e) => e.nome)).toEqual(["a", "c"]);
    expect(f({ ultimaEtapa: "c" }).map((e) => e.nome)).toEqual(["a", "b", "c"]);
  });
  it("casas decimais, maior queda e meta de conversão", () => {
    expect(f({ casasDecimais: 1 })[1]?.rotuloDoPercentual).toBe("40,0%");
    expect(f({ destacarMaiorQueda: true }).filter((e) => e.pior).map((e) => e.nome)).toEqual(["c"]);
    expect(f({ metaDeConversao: { ligada: true, taxaMinima: 30 } }).filter((e) => e.abaixo).map((e) => e.nome)).toEqual(["c"]);
  });
  it("formato compacto e cores", () => {
    expect(coresDoFunil(3, "por_etapa", true).at(-1)).toBe("#16A34A");
    expect(coresDoFunil(3, "iguais")).toEqual(Array(3).fill("var(--color-casca-marca)"));
    const grande = resultado([col("v0", "variavel"), col("i0", "indicador", { unidade: "contagem" })], [{ v0: "a", i0: 1240 }]);
    expect(etapasDoFunil(grande, O({ funil: { formatoDosNumeros: "compacto" } }).funil)[0]?.rotuloDoValor).toBe("1,2 mil");
  });
  it("a tabela ganha a coluna META com atingiu", () => {
    const rr = resultado([col("v0", "variavel"), col("i0", "indicador", { unidade: "contagem" })], [{ v0: "a", i0: 30 }, { v0: "b", i0: 10 }]);
    const t = linhasDaTabela(rr, undefined, O({ metas: { ligadas: true, itens: [{ indicador: "i0", valor: 25, visivel: true }] } }));
    expect(t.colunas.at(-1)?.nome).toBe("META");
    expect(t.linhas.map((l) => l.meta_i0)).toEqual([{ valor: 25, atingiu: true }, { valor: 25, atingiu: false }]);
    expect(linhasDaTabela(rr).colunas.some((c) => c.nome === "META")).toBe(false);
  });
});

describe("formatos, cores e CSV do detalhamento", () => {
  it("formata variação, compacto e percentual", () => {
    expect(formatarVariacao(12.5)).toBe("+12,5%");
    expect(formatarVariacao(-3.2)).toBe("−3,2%");
    expect(formatarVariacao(0)).toBe("0%");
    expect(formatarCompacto(1240)).toBe("1,2 mil");
    expect(formatarPercentual(39.41, 0)).toBe("39%");
    expect(formatarPercentual(39.41, 1)).toBe("39,4%");
    expect(formatarPercentual(39.41, 2)).toBe("39,41%");
  });
  it("avatar estável e escala do heatmap", () => {
    expect(corDoAvatar("Ana")).toBe(corDoAvatar("Ana"));
    expect(escalaDoHeatmap(0)).toBe("var(--color-casca-raia)");
    expect(escalaDoHeatmap(4)).toContain("100%");
  });
  it("colunas guardadas: inválido ou storage que lança volta ao padrão", () => {
    const disp = [{ chave: "a", nome: "A", padrao: true }, { chave: "b", nome: "B", padrao: true }, { chave: "campo:x", nome: "X", padrao: false }];
    expect(colunasGuardadas("g", disp, { getItem: () => JSON.stringify(["b", "zzz"]), setItem: () => {} })).toEqual(["b"]);
    expect(colunasGuardadas("g", disp, { getItem: () => { throw new Error("x"); }, setItem: () => {} })).toEqual(["a", "b"]);
    expect(colunasGuardadas("g", disp, { getItem: () => "lixo", setItem: () => {} })).toEqual(["a", "b"]);
  });
  it("csv em formato brasileiro e nome do arquivo", () => {
    const cols = [{ chave: "valor", nome: "Valor", formato: "valor" as const }, { chave: "d", nome: "Data", formato: "data" as const }, { chave: "s", nome: "Status", formato: "status_do_negocio" as const }];
    const csv = csvDoDetalhamento(cols, [{ valor: 1500, d: "2026-09-28T16:56:00Z", s: "won" }], "America/Sao_Paulo");
    expect(csv).toBe('Valor,Data,Status\r\n"1500,00","28/09/2026, 13:56",Ganho\r\n');
    expect(nomeDoCsvDoDetalhamento("Meu/gráfico", "Quantidade", "28-09-2026")).toBe("Meugráfico - Quantidade - 28-09-2026.csv");
  });
});

describe("pontoDoClique", () => {
  const p = perguntaSchema.parse({ indicadores: ["negocio.ganhos"], variaveis: ["negocio.origem"] });
  it("sem tempo, o rótulo do eixo X fixa a 1ª variável", () => {
    const r = resultado([col("v0", "variavel"), col("i0", "indicador")], [{ v0: "p1", v0_rotulo: "Origem 1", i0: 3 }]);
    expect(pontoDoClique(r, p, { rotulo: "Origem 1" })).toEqual({ variaveis: [{ id: "negocio.origem", valor: "p1" }] });
    expect(pontoDoClique(r, p)).toEqual({ variaveis: [] });
  });
  it("com tempo, o bucket vai em t e a série fixa a variável", () => {
    const r = resultado([col("t", "tempo"), col("v0", "variavel"), col("i0", "indicador")], [{ t: "2026-10-01T00:00:00", v0: "p1", v0_rotulo: "Origem 1", i0: 3 }]);
    expect(pontoDoClique(r, p, { t: "2026-10-01T00:00:00", serie: "Origem 1" })).toEqual({
      variaveis: [{ id: "negocio.origem", valor: "p1" }],
      t: "2026-10-01T00:00:00",
    });
  });
  it("célula do heatmap", () => {
    expect(pontoDoClique(resultado([], []), p, { dsem: 2, hora: 14 })).toEqual({ variaveis: [], diaDaSemana: 2, hora: 14 });
  });
});
