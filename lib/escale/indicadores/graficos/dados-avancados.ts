/** O `Resultado` → os dados dos tipos da 7E (ranking, barra 100%, número avançado, heatmap, sankey) — puro. */
import type { Unidade } from "../catalogo/tipos";
import type { Resultado } from "../motor/executar";
import { variacaoPercentual } from "./comparacao";
import { dadosCartesianos, rotuloDaVariavel, type DadosCartesianos } from "./dados";
import { faixaDeSaude, metaDoIndicador, percentualDaMeta } from "./metas";
import type { OpcoesDoGrafico } from "./opcoes";
import { projetar } from "./projecao";

type Linha = Record<string, unknown>;
const numero = (v: unknown): number => {
  const n = Number(v);
  return v === null || v === undefined || !Number.isFinite(n) ? 0 : n;
};
const primeiroIndicador = (r: Resultado) => r.colunas.find((c) => c.papel === "indicador");

export const ITENS_VISIVEIS_DO_RANKING = 5;
export type LinhaDoRanking = {
  posicao: number;
  nome: string;
  iniciais: string;
  valor: number;
  unidade: Unidade;
  proporcao: number;
  foraDaMeta: number | null;
};

/** "Maria Souza" vira "MS"; uma palavra só vira as duas primeiras letras. */
export function iniciaisDe(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return "?";
  const letras =
    palavras.length === 1
      ? (palavras[0] ?? "").slice(0, 2)
      : `${palavras[0]?.[0] ?? ""}${palavras[palavras.length - 1]?.[0] ?? ""}`;
  return letras.toUpperCase();
}

export function linhasDoRanking(r: Resultado, o: OpcoesDoGrafico): LinhaDoRanking[] {
  const ind = primeiroIndicador(r);
  if (!ind) return [];
  const faixas = new Set(o.ranking.faixasForaDaMeta);
  const grupos = new Map<string, { nome: string; total: number; fora: number }>();
  for (const l of r.linhas) {
    const nome = rotuloDaVariavel(l, 0);
    const g = grupos.get(nome) ?? { nome, total: 0, fora: 0 };
    const valor = numero(l[ind.chave]);
    g.total += valor;
    if (faixas.size && faixas.has(rotuloDaVariavel(l, 1))) g.fora += valor;
    grupos.set(nome, g);
  }
  const ordenados = [...grupos.values()].sort((a, b) => b.total - a.total);
  const maior = ordenados[0]?.total ?? 0;
  return ordenados.map((g, i) => ({
    posicao: i + 1,
    nome: g.nome,
    iniciais: iniciaisDe(g.nome),
    valor: g.total,
    unidade: ind.unidade ?? "contagem",
    proporcao: maior > 0 ? g.total / maior : 0,
    foraDaMeta: faixas.size && g.total > 0 ? (100 * g.fora) / g.total : null,
  }));
}

function normalizar(d: DadosCartesianos): DadosCartesianos {
  const pontos = d.pontos.map((p) => {
    const soma = d.series.reduce((n, s) => n + numero(p[s.chave]), 0);
    return { ...p, ...Object.fromEntries(d.series.map((s) => [s.chave, soma > 0 ? (100 * numero(p[s.chave])) / soma : 0])) };
  });
  return { ...d, pontos, series: d.series.map((s) => ({ ...s, unidade: "percentual" as const })) };
}

/** T17: cada ponto normalizado a 0–100; o formato "resumo" sem 2ª variável vira uma barra única com as fatias. */
export function pilhas100(r: Resultado, o: OpcoesDoGrafico): DadosCartesianos {
  const base = dadosCartesianos(r, undefined, "barra_empilhada");
  const nIndicadores = r.colunas.filter((c) => c.papel === "indicador").length;
  const serie = base.series[0];
  if (serie && o.barra100.formato === "resumo" && base.eixoX === "variavel" && base.series.length === nIndicadores) {
    const series = base.pontos.map((p, i) => ({ ...serie, chave: `s${i}`, nome: String(p.rotulo), cor: dadosCartesianos(r).series[0]?.cor ?? serie.cor }));
    const ponto: Record<string, string | number | null> = { rotulo: "Período" };
    base.pontos.forEach((p, i) => {
      ponto[`s${i}`] = numero(p[serie.chave]);
    });
    return normalizar({ ...base, pontos: [ponto], series });
  }
  return normalizar(base);
}

export type NumeroAvancado = {
  valor: number;
  unidade: Unidade;
  anterior: number | null;
  variacao: number | null;
  meta: number | null;
  pctDaMeta: number | null;
  faixa: "saudavel" | "alerta" | "critico" | null;
  projecao: number | null;
};

export function numeroAvancado(r: Resultado, o: OpcoesDoGrafico): NumeroAvancado {
  const ind = primeiroIndicador(r);
  const unidade = ind?.unidade ?? "contagem";
  if (!ind) return { valor: 0, unidade, anterior: null, variacao: null, meta: null, pctDaMeta: null, faixa: null, projecao: null };
  const valor = r.linhas.reduce((n, l) => n + numero(l[ind.chave]), 0);
  const anteriores: Linha[] | undefined = r.comparacao?.linhas;
  const anterior = anteriores?.length ? anteriores.reduce((n, l) => n + numero(l[ind.chave]), 0) : null;
  const meta = metaDoIndicador(o, ind.chave);
  const pctDaMeta = meta ? percentualDaMeta(valor, meta.valor) : null;
  const modo = o.visualizacao.projecaoDiasUteis ? "dias_uteis" : o.visualizacao.projecaoNormal ? "normal" : null;
  const projecao = modo ? (projetar(r, { chave: ind.chave, unidade }, modo)?.total ?? null) : null;
  return {
    valor,
    unidade,
    anterior,
    variacao: variacaoPercentual(valor, anterior),
    meta: meta?.valor ?? null,
    pctDaMeta,
    faixa: faixaDeSaude(pctDaMeta, o.numeroAvancado.faixas),
    projecao,
  };
}

export const HORAS_DO_DIA = Array.from({ length: 24 }, (_, i) => i);
export const HORAS_COMERCIAIS = Array.from({ length: 12 }, (_, i) => i + 7);
export type CelulaDoHeatmap = { dsem: number; hora: number; valor: number; nivel: 0 | 1 | 2 | 3 | 4 };

export function celulasDoHeatmap(r: Resultado, o: OpcoesDoGrafico): { celulas: CelulaDoHeatmap[]; maximo: number; horas: number[] } {
  const ind = primeiroIndicador(r);
  const horas = o.heatmap.janela === "comercial" ? HORAS_COMERCIAIS : HORAS_DO_DIA;
  const brutas = r.linhas
    .filter((l) => horas.includes(numero(l.hora)))
    .map((l) => ({ dsem: numero(l.dsem), hora: numero(l.hora), valor: ind ? numero(l[ind.chave]) : 0 }));
  const maximo = brutas.reduce((m, c) => Math.max(m, c.valor), 0);
  const positivos = brutas.map((c) => c.valor).filter((v) => v > 0).sort((a, b) => a - b);
  const nivelDe = (valor: number): 0 | 1 | 2 | 3 | 4 => {
    if (valor <= 0 || maximo <= 0) return 0;
    if (o.heatmap.escala === "linear") return Math.min(4, Math.max(1, Math.ceil((4 * valor) / maximo))) as 1 | 2 | 3 | 4;
    const posicao = positivos.findIndex((v) => v >= valor);
    return Math.min(4, 1 + Math.floor((4 * posicao) / positivos.length)) as 1 | 2 | 3 | 4;
  };
  return { celulas: brutas.map((c) => ({ ...c, nivel: nivelDe(c.valor) })), maximo, horas };
}

const NOS_POR_LADO_MAX = 12;
export const ROTULO_OUTROS = "Outros";
export type FluxoDoSankey = {
  nodes: Array<{ name: string }>;
  links: Array<{ source: number; target: number; value: number }>;
  total: number;
};

/** T16: precisa de 2 variáveis; mais de 12 nós por lado viram "Outros"; links sem valor saem. */
export function fluxoDoSankey(r: Resultado): FluxoDoSankey | null {
  const ind = primeiroIndicador(r);
  if (!ind || r.colunas.filter((c) => c.papel === "variavel").length < 2) return null;
  const manter = (lado: 0 | 1): string[] => {
    const somas = new Map<string, number>();
    for (const l of r.linhas) {
      const nome = rotuloDaVariavel(l, lado);
      somas.set(nome, (somas.get(nome) ?? 0) + numero(l[ind.chave]));
    }
    return [...somas.entries()].sort((a, b) => b[1] - a[1]).slice(0, NOS_POR_LADO_MAX).map(([n]) => n);
  };
  const esquerda = manter(0);
  const direita = manter(1);
  const nodes: Array<{ name: string }> = [];
  const indiceEsquerda = new Map<string, number>();
  const indiceDireita = new Map<string, number>();
  const noDe = (nome: string, mapa: Map<string, number>): number => {
    const achado = mapa.get(nome);
    if (achado !== undefined) return achado;
    nodes.push({ name: nome });
    mapa.set(nome, nodes.length - 1);
    return nodes.length - 1;
  };
  const links = new Map<string, { source: number; target: number; value: number }>();
  let total = 0;
  for (const l of r.linhas) {
    const valor = numero(l[ind.chave]);
    if (valor <= 0) continue;
    const de = rotuloDaVariavel(l, 0);
    const para = rotuloDaVariavel(l, 1);
    const source = noDe(esquerda.includes(de) ? de : ROTULO_OUTROS, indiceEsquerda);
    const target = noDe(direita.includes(para) ? para : ROTULO_OUTROS, indiceDireita);
    const chave = `${source}>${target}`;
    const atual = links.get(chave) ?? { source, target, value: 0 };
    links.set(chave, { ...atual, value: atual.value + valor });
    total += valor;
  }
  return { nodes, links: [...links.values()], total };
}
