/** O `Resultado` do motor (7A) → os dados que cada tipo de gráfico desenha (Fase 7C). */
import type { Unidade } from "../catalogo/tipos";
import type { Resultado } from "../motor/executar";
import type { Coluna } from "../motor/sql";
import type { Granularidade } from "../pergunta";
import { coresDoFunil, corDaSerie } from "./cores";
import { rotuloDoTempo } from "./formatos";
import type { CalculoDoFunil } from "./opcoes";
import type { TipoPrincipal } from "./tipos";

type Linha = Record<string, unknown>;

/** Texto da Clint para valor nulo. */
export const ROTULO_VAZIO = "Vazio";

export type Serie = { chave: string; nome: string; unidade: Unidade; cor: string };
export type DadosCartesianos = {
  /** Cada ponto leva `rotulo` (o texto do eixo X), `t` (só com tempo) e um número por série (`s0`, `s1`…). */
  pontos: Array<Record<string, string | number | null>>;
  series: Serie[];
  eixoX: "tempo" | "variavel";
  granularidade?: Granularidade;
};
export type Fatia = { nome: string; valor: number; cor: string };
export type EtapaDoFunil = { chave: string; nome: string; valor: number; percentual: number; cor: string };
export type ColunaDaTabela = { chave: string; nome: string; unidade?: Unidade; tipo?: string };

const indicadoresDe = (r: Resultado): Coluna[] => r.colunas.filter((c) => c.papel === "indicador");
const variaveisDe = (r: Resultado): Coluna[] => r.colunas.filter((c) => c.papel === "variavel");

const numero = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** O rótulo da variável `i` na linha: o nome (rótulo do catálogo) ou a própria chave; nulo vira "Vazio". */
function rotuloDaVariavel(linha: Linha, i: number): string {
  const texto = linha[`v${i}_rotulo`] ?? linha[`v${i}`];
  return texto === null || texto === undefined || String(texto) === "" ? ROTULO_VAZIO : String(texto);
}

const juntarRotulos = (linha: Linha, de: number, ate: number): string =>
  Array.from({ length: ate - de }, (_, k) => rotuloDaVariavel(linha, de + k)).join(", ");

export const semDados = (r: Resultado): boolean => r.linhas.length === 0;

type Celula = { rotulo: string; t?: string; valores: Map<string, number | null> };

export function dadosCartesianos(r: Resultado, granularidade?: Granularidade, tipo?: TipoPrincipal): DadosCartesianos {
  const indicadores = indicadoresDe(r);
  const nVariaveis = variaveisDe(r).length;
  const comTempo = r.colunas.some((c) => c.papel === "tempo");
  const ausente = tipo === "barra_empilhada" ? 0 : null;

  // Com tempo, toda variável vira série; sem tempo, a 1ª é o eixo X e as demais viram séries.
  const primeiraDeSerie = comTempo ? 0 : 1;
  const series: Serie[] = [];
  const indiceDaSerie = new Map<string, string>();
  const acharSerie = (chave: string, nome: string, unidade: Unidade): string => {
    const achada = indiceDaSerie.get(chave);
    if (achada !== undefined) return achada;
    const i = series.length;
    series.push({ chave: `s${i}`, nome, unidade, cor: corDaSerie(i) });
    indiceDaSerie.set(chave, `s${i}`);
    return `s${i}`;
  };

  const celulas = new Map<string, Celula>();
  for (const linha of r.linhas) {
    const t = comTempo ? String(linha.t ?? "") : undefined;
    const rotulo = comTempo ? "" : rotuloDaVariavel(linha, 0);
    const chaveDoPonto = comTempo ? (t ?? "") : rotulo;
    const ponto: Celula = celulas.get(chaveDoPonto) ?? { rotulo, ...(t !== undefined ? { t } : {}), valores: new Map() };
    celulas.set(chaveDoPonto, ponto);
    const nomeDaVariavel = nVariaveis > primeiraDeSerie ? juntarRotulos(linha, primeiraDeSerie, nVariaveis) : null;
    for (const ind of indicadores) {
      const nome =
        nomeDaVariavel === null ? ind.nome : indicadores.length > 1 ? `${nomeDaVariavel}, ${ind.nome}` : nomeDaVariavel;
      const chave = acharSerie(`${nomeDaVariavel ?? ""}|${ind.chave}`, nome, ind.unidade ?? "contagem");
      ponto.valores.set(chave, numero(linha[ind.chave]));
    }
  }

  const ordenados = [...celulas.values()];
  if (comTempo) ordenados.sort((a, b) => String(a.t).localeCompare(String(b.t)));
  const variosDias = new Set(ordenados.map((p) => String(p.t).slice(0, 10))).size > 1;
  const pontos = ordenados.map((p) => ({
    rotulo: comTempo ? rotuloDoTempo(String(p.t), granularidade, variosDias) : p.rotulo,
    ...(p.t !== undefined ? { t: p.t } : {}),
    ...Object.fromEntries(series.map((s) => [s.chave, p.valores.get(s.chave) ?? ausente])),
  }));
  return { pontos, series, eixoX: comTempo ? "tempo" : "variavel", ...(granularidade ? { granularidade } : {}) };
}

export function fatias(r: Resultado): { fatias: Fatia[]; unidade: Unidade } {
  const ind = indicadoresDe(r)[0];
  if (!ind) return { fatias: [], unidade: "contagem" };
  const nVariaveis = variaveisDe(r).length;
  const validas = r.linhas
    .map((linha) => ({
      nome: nVariaveis > 0 ? juntarRotulos(linha, 0, nVariaveis) : ind.nome,
      valor: numero(linha[ind.chave]) ?? 0,
    }))
    .filter((f) => f.valor > 0);
  return { fatias: validas.map((f, i) => ({ ...f, cor: corDaSerie(i) })), unidade: ind.unidade ?? "contagem" };
}

/**
 * O funil (7C, 7D): `funil` ausente = percentual sobre a primeira etapa (o desenho da 7C). "automatico" (S11):
 * sobre a primeira etapa quando a variável tem ordem natural (etapa do quadro), senão participação no total.
 * `primeiraEtapa` (a chave `v0`) sobe para o topo e vira a base do cálculo.
 */
export function etapasDoFunil(
  r: Resultado,
  funil?: { primeiraEtapa: string | null; calculo: CalculoDoFunil },
  temOrdemNatural = false,
): EtapaDoFunil[] {
  const ind = indicadoresDe(r)[0];
  if (!ind) return [];
  let brutas = r.linhas.map((linha) => ({
    chave: texto(linha.v0),
    nome: rotuloDaVariavel(linha, 0),
    valor: numero(linha[ind.chave]) ?? 0,
  }));
  const fixada = funil?.primeiraEtapa ? brutas.findIndex((e) => e.chave === funil.primeiraEtapa) : -1;
  if (fixada > 0) brutas = [brutas[fixada] as (typeof brutas)[number], ...brutas.filter((_, i) => i !== fixada)];
  const calculo: Exclude<CalculoDoFunil, "automatico"> = !funil
    ? "primeira_etapa"
    : funil.calculo === "automatico"
      ? temOrdemNatural
        ? "primeira_etapa"
        : "participacao"
      : funil.calculo;
  const total = brutas.reduce((n, e) => n + e.valor, 0);
  const divisor = (i: number): number =>
    calculo === "primeira_etapa" ? (brutas[0]?.valor ?? 0) : calculo === "etapa_anterior" ? (brutas[i - 1]?.valor ?? brutas[i]?.valor ?? 0) : total;
  const cores = coresDoFunil(brutas.length);
  return brutas.map((e, i) => {
    const base = divisor(i);
    return { ...e, percentual: base === 0 ? 0 : (100 * e.valor) / base, cor: cores[i] ?? "#16A34A" };
  });
}

const texto = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

/** Média e mediana da 1ª série, ignorando pontos sem valor; sem pontos, `null` (provisório: uma linha só). */
export function linhasDeReferencia(d: DadosCartesianos): { media: number | null; mediana: number | null } {
  const chave = d.series[0]?.chave;
  const valores = chave
    ? d.pontos.map((p) => p[chave]).filter((v): v is number => typeof v === "number")
    : [];
  if (valores.length === 0) return { media: null, mediana: null };
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  const mediana = ordenados.length % 2 ? (ordenados[meio] as number) : ((ordenados[meio - 1] as number) + (ordenados[meio] as number)) / 2;
  return { media: valores.reduce((n, v) => n + v, 0) / valores.length, mediana };
}

/** Número e Painel de KPI: os indicadores (até 2, o limite da Clint) da 1ª linha; sem linhas, 0. */
export function numeros(r: Resultado): Array<{ nome: string; valor: number; unidade: Unidade }> {
  const linha = r.linhas[0];
  return indicadoresDe(r)
    .slice(0, 2)
    .map((c) => ({ nome: c.nome, valor: linha ? (numero(linha[c.chave]) ?? 0) : 0, unidade: c.unidade ?? "contagem" }));
}

/**
 * Colunas = variáveis (rótulo), tempo, indicadores, na ordem da pergunta; a `moedas` nunca aparece.
 * `assunto` acrescenta o nome do assunto ao cabeçalho das variáveis ("Negócio Origem"), como a Clint.
 */
export function linhasDaTabela(
  r: Resultado,
  assunto?: string,
): { colunas: ColunaDaTabela[]; linhas: Array<Record<string, unknown>> } {
  const colunas: ColunaDaTabela[] = r.colunas
    .filter((c) => c.papel === "variavel" || c.papel === "tempo" || c.papel === "indicador")
    .map((c) => ({
      chave: c.chave,
      nome: c.papel === "variavel" && assunto ? `${assunto} ${c.nome}` : c.nome,
      ...(c.unidade ? { unidade: c.unidade } : {}),
      tipo: c.papel,
    }));
  const linhas = r.linhas.map((linha) => {
    const saida: Record<string, unknown> = {};
    for (const c of r.colunas) {
      if (c.papel === "variavel") saida[c.chave] = rotuloDaVariavel(linha, Number(c.chave.slice(1)));
      else if (c.papel === "tempo" || c.papel === "indicador") saida[c.chave] = linha[c.chave] ?? null;
    }
    return saida;
  });
  return { colunas, linhas };
}
