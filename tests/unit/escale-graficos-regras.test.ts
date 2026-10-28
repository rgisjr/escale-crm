import { describe, expect, it } from "vitest";

import { CORES_DAS_SERIES, coresDoFunil, corDaSerie } from "@/lib/escale/indicadores/graficos/cores";
import { csvDoResultado, nomeDoCsv } from "@/lib/escale/indicadores/graficos/csv";
import {
  dadosCartesianos,
  etapasDoFunil,
  fatias,
  linhasDaTabela,
  numeros,
} from "@/lib/escale/indicadores/graficos/dados";
import { formatarEixo, formatarValor, rotuloDoTempo } from "@/lib/escale/indicadores/graficos/formatos";
import { opcoesComPadrao } from "@/lib/escale/indicadores/graficos/opcoes";
import {
  alturaUtil,
  estadoDaData,
  estadoDoResultado,
  layoutsMudados,
  posicaoNoFim,
} from "@/lib/escale/indicadores/graficos/regras-do-card";
import { layoutValido } from "@/lib/escale/indicadores/graficos/tipos";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import { nomeDaCopia } from "@/lib/escale/indicadores/paineis/regras";
import { perguntaSchema } from "@/lib/escale/indicadores/pergunta";

const sp = (s: string) => s.replace(/ /g, " ");
const resultado = (colunas: Resultado["colunas"], linhas: Resultado["linhas"], avisos: Resultado["avisos"] = []): Resultado => ({
  colunas,
  linhas,
  truncado: false,
  duracaoMs: 1,
  avisos,
  ignorados: [],
});
const ind = (chave: string, nome: string, unidade: "contagem" | "valor" = "contagem") => ({ chave, nome, papel: "indicador" as const, unidade });
const vari = (chave: string, nome: string) => ({ chave, nome, papel: "variavel" as const });
const tempo = { chave: "t", nome: "Data de criação", papel: "tempo" as const };

describe("formatos", () => {
  it("valores brasileiros", () => {
    expect(formatarValor(1541, "contagem")).toBe("1.541");
    expect(formatarValor(2.5, "contagem")).toBe("2,5");
    expect(sp(formatarValor(325264.14, "valor"))).toBe("R$ 325.264,14");
    expect(formatarValor(2.333, "percentual")).toBe("2,33%");
    expect(formatarValor(50, "percentual")).toBe("50%");
    expect(formatarValor(0.4, "percentual")).toBe("<1%");
    expect(formatarValor(2900481, "duracao")).toBe("33d 13h 41m 21s");
    expect(formatarValor(2456, "duracao")).toBe("40m 56s");
    expect(formatarValor(0, "duracao")).toBe("0s");
    expect(formatarValor(null, "contagem")).toBe("—");
  });
  it("eixo compacto e rótulos de tempo", () => {
    expect(formatarEixo(357800, "contagem")).toBe("357,8 mil");
    expect(formatarEixo(1200000, "contagem")).toBe("1,2 mi");
    expect(formatarEixo(45, "contagem")).toBe("45");
    expect(rotuloDoTempo("2026-10-03T00:00:00", "dia", false)).toBe("03/10");
    expect(rotuloDoTempo("2026-10-01T00:00:00", "mes", false)).toBe("out/2026");
    expect(rotuloDoTempo("2026-07-01T00:00:00", "trimestre", false)).toBe("3º tri/2026");
    expect(rotuloDoTempo("2026-10-03T14:00:00", "hora", true)).toBe("03/10 14h");
    expect(rotuloDoTempo("2026-10-03T14:00:00", "hora", false)).toBe("14h");
  });
});

describe("cores e opções", () => {
  it("30 cores, marca primeiro", () => {
    expect(CORES_DAS_SERIES).toHaveLength(30);
    expect(CORES_DAS_SERIES[0]).toBe("var(--color-casca-marca)");
    expect(CORES_DAS_SERIES[3]).toBe("#4D74FF");
    expect(CORES_DAS_SERIES[29]).toBe("#ABAFCF");
    expect(corDaSerie(31)).toBe(corDaSerie(1));
    expect(coresDoFunil(1)).toEqual(["#16A34A"]);
    const f = coresDoFunil(8);
    expect(f).toHaveLength(8);
    expect(f[7]).toBe("#16A34A");
  });
  it("padrão das opções", () => {
    const o = opcoesComPadrao(undefined);
    expect(o.visualizacao).toEqual({
      valores: false,
      legendas: true,
      grade: true,
      linhaDeMedia: false,
      linhaDeMediana: false,
      projecaoNormal: false,
      projecaoDiasUteis: false,
    });
    expect(o.tabela).toEqual({ totais: false });
    expect(o.funil).toMatchObject({ primeiraEtapa: null, calculo: "automatico", cores: "por_etapa" });
    expect(opcoesComPadrao({ visualizacao: { valores: true }, funil: { x: 1 } }).visualizacao.valores).toBe(true);
    expect(opcoesComPadrao("lixo").visualizacao.legendas).toBe(true);
  });
});

describe("dados", () => {
  it("tempo sem variável: uma série por indicador, em ordem de t", () => {
    const r = resultado([tempo, ind("i0", "A"), ind("i1", "B")], [
      { t: "2026-10-02T00:00:00", i0: 2, i1: 5 },
      { t: "2026-10-01T00:00:00", i0: 1, i1: 4 },
    ]);
    const d = dadosCartesianos(r, "dia");
    expect(d.series.map((s) => s.nome)).toEqual(["A", "B"]);
    expect(d.pontos.map((p) => p.rotulo)).toEqual(["01/10", "02/10"]);
    expect(d.pontos[0]?.s0).toBe(1);
  });
  it("tempo + variável: série por valor; ausente 0 na empilhada e null na linha", () => {
    const r = resultado([vari("v0", "Dono"), tempo, ind("i0", "Q")], [
      { v0: "a", v0_rotulo: "Ana", t: "2026-10-01T00:00:00", i0: 1 },
      { v0: "b", v0_rotulo: "Beto", t: "2026-10-02T00:00:00", i0: 2 },
    ]);
    const linha = dadosCartesianos(r, "dia", "linha");
    expect(linha.series.map((s) => s.nome)).toEqual(["Ana", "Beto"]);
    expect(linha.pontos[0]?.s1).toBeNull();
    expect(dadosCartesianos(r, "dia", "barra_empilhada").pontos[0]?.s1).toBe(0);
  });
  it("sem tempo com 2 variáveis: X = 1ª, séries = valores da 2ª; nulo vira Vazio", () => {
    const r = resultado([vari("v0", "Origem"), vari("v1", "Status"), ind("i0", "Q")], [
      { v0: "x", v1: "open", i0: 3 },
      { v0: null, v1: "won", i0: 1 },
    ]);
    const d = dadosCartesianos(r);
    expect(d.series.map((s) => s.nome)).toEqual(["open", "won"]);
    expect(d.pontos.map((p) => p.rotulo)).toEqual(["x", "Vazio"]);
  });
  it("fatias, funil e números", () => {
    const r = resultado([vari("v0", "Status"), vari("v1", "Dono"), ind("i0", "Q")], [
      { v0: "Aberto", v1: "Luciana", i0: 34 },
      { v0: "Perdido", v1: "Ana", i0: 0 },
    ]);
    expect(fatias(r).fatias.map((f) => f.nome)).toEqual(["Aberto, Luciana"]);
    const f = resultado([vari("v0", "Etapa"), ind("i0", "Q")], [
      { v0: "Lead", i0: 34 },
      { v0: "Qualif", i0: 17 },
      { v0: "Fechou", i0: 2 },
    ]);
    expect(etapasDoFunil(f).map((e) => Math.round(e.percentual * 100) / 100)).toEqual([100, 50, 5.88]);
    expect(numeros(resultado([ind("i0", "Q")], []))).toEqual([{ nome: "Q", valor: 0, unidade: "contagem" }]);
  });
  it("tabela não tem a coluna moedas e leva o assunto no cabeçalho da variável", () => {
    const r = resultado([vari("v0", "Origem"), ind("i0", "Q")], [{ v0: "x", i0: 1 }]);
    expect(linhasDaTabela(r, "Negócio").colunas.map((c) => c.nome)).toEqual(["Negócio Origem", "Q"]);
  });
});

describe("regras do card", () => {
  it("alturas, data e estados", () => {
    expect(alturaUtil(4)).toBe(159);
    expect(alturaUtil(2)).toBe(55);
    const p = (o: unknown) => perguntaSchema.parse({ indicadores: ["negocio.ganhos"], ...(o as object) });
    expect(estadoDaData(p({}))).toBe("nao_se_aplica");
    expect(estadoDaData(p({ tempo: { campo: "negocio.criado_em", periodo: { atalho: "hoje" } } }))).toBe("aplicado");
    expect(estadoDaData(p({ tempo: { campo: "negocio.criado_em", periodo: { atalho: "hoje" }, fixo: true } }))).toBe("fixado");
    const vazio = resultado([ind("i0", "Q")], []);
    const base = { apareceu: true, carregando: false, erro: null };
    expect(estadoDoResultado({ ...base, apareceu: false, tipo: "barra" })).toBe("invisivel");
    expect(estadoDoResultado({ ...base, resultado: resultado([], [], ["moedas_diferentes"]), tipo: "barra" })).toBe("moedas");
    expect(estadoDoResultado({ ...base, resultado: vazio, tipo: "barra" })).toBe("vazio");
    expect(estadoDoResultado({ ...base, resultado: vazio, tipo: "numero" })).toBe("pronto");
    expect(estadoDoResultado({ ...base, resultado: vazio, tipo: "painel_de_kpi" })).toBe("pronto");
  });
  it("posição no fim e layouts mudados", () => {
    expect(posicaoNoFim([{ x: 0, y: 0, w: 6, h: 4 }, { x: 6, y: 2, w: 6, h: 4 }], 6, 4)).toEqual({ x: 0, y: 6, w: 6, h: 4 });
    const antes = [
      { id: "a", layout: { x: 0, y: 0, w: 6, h: 4 } },
      { id: "b", layout: { x: 6, y: 0, w: 6, h: 4 } },
    ];
    expect(layoutsMudados(antes, [{ i: "a", x: 0, y: 0, w: 6, h: 4 }, { i: "b", x: 6, y: 1, w: 6, h: 4 }])).toEqual([
      { id: "b", x: 6, y: 1, w: 6, h: 4 },
    ]);
  });
  it("layout inválido vai para o fim", () => {
    expect(layoutValido({ x: 20, y: 0, w: 6, h: 4 })).toEqual({ x: 0, y: 9999, w: 6, h: 4 });
    expect(layoutValido({ x: 0, y: 1, w: 6, h: 4 })).toEqual({ x: 0, y: 1, w: 6, h: 4 });
  });
});

describe("csv e cópia", () => {
  it("cabeçalho, número brasileiro e guarda de fórmula", () => {
    const r = resultado([vari("v0", "Título"), ind("i0", "Valor", "valor")], [
      { v0: "=SOMA(A1)", i0: 1234.5 },
    ]);
    const csv = csvDoResultado(r);
    expect(csv.split("\r\n")[0]).toBe("Título,Valor");
    expect(csv).toContain("'=SOMA(A1)");
    expect(csv).toContain('"1234,5"');
  });
  it("nome do arquivo e da cópia", () => {
    expect(nomeDoCsv("Vendas/Mês", new Date(2026, 9, 27))).toBe("VendasMês - 27-10-2026.csv");
    const c = nomeDaCopia("x".repeat(120), 120);
    expect(c).toHaveLength(120);
    expect(c.endsWith(" (cópia)")).toBe(true);
  });
});
