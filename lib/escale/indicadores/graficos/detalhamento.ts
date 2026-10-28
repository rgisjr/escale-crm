/**
 * Regras puras do detalhamento do gráfico (fork Escale, Fase 7E): colunas, formatos BR, CSV e o
 * ponto clicado. Servem à tela e à rota do CSV.
 */
import { celula, numeroBr } from "@/lib/escale/exportar/csv-do-quadro";

import type { FormatoDaColuna } from "../catalogo/tipos";
import type { Resultado } from "../motor/executar";
import type { Pergunta, Ponto } from "../pergunta";
import { rotuloDaVariavel } from "./dados";
import { formatarDuracao } from "./formatos";

export type ColunaDoDetalhamentoNaTela = { chave: string; nome: string; formato?: FormatoDaColuna | null; padrao: boolean };
type ColunaComFormato = { chave: string; nome: string; formato?: FormatoDaColuna | null };
export type LinhaDoDetalhamento = Record<string, unknown>;

export const CHAVE_DAS_COLUNAS = (graficoId: string): string => `escale:indicadores:colunas:${graficoId}`;

const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const NUMERO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const ROTULO_DO_STATUS_DO_NEGOCIO: Record<string, string> = { open: "Em aberto", won: "Ganho", lost: "Perdido" };
const ROTULO_DO_STATUS_DA_CONVERSA: Record<string, string> = { open: "Aberta", closed: "Encerrada", pending: "Pendente" };

const comoNumero = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** "28/09/2026, 13:56" no fuso da organização; inválida vira vazio. */
export function formatarDataHora(valor: unknown, fuso: string): string {
  if (valor === null || valor === undefined) return "";
  const d = valor instanceof Date ? valor : new Date(String(valor));
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

/** O texto que a tela mostra para uma célula; nulo = "—". */
export function textoDaCelula(valor: unknown, formato: FormatoDaColuna | null | undefined, fuso: string, t: (s: string) => string = (s) => s): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  switch (formato) {
    case "valor": {
      const n = comoNumero(valor);
      return n === null ? "—" : REAIS.format(n);
    }
    case "numero": {
      const n = comoNumero(valor);
      return n === null ? "—" : NUMERO.format(n);
    }
    case "duracao": {
      const n = comoNumero(valor);
      return n === null ? "—" : formatarDuracao(n);
    }
    case "data":
      return formatarDataHora(valor, fuso) || "—";
    case "status_do_negocio":
      return t(ROTULO_DO_STATUS_DO_NEGOCIO[String(valor)] ?? String(valor));
    case "status_da_conversa":
      return t(ROTULO_DO_STATUS_DA_CONVERSA[String(valor)] ?? String(valor));
    default:
      return String(valor);
  }
}

/** O valor que o CSV leva: número BR para valor/número/duração (em segundos), texto para o resto. */
function valorDoCsv(valor: unknown, formato: FormatoDaColuna | null | undefined, fuso: string, t: (s: string) => string): unknown {
  if (valor === null || valor === undefined) return "";
  if (formato === "valor" || formato === "numero" || formato === "duracao") {
    const n = comoNumero(valor);
    return n === null ? "" : numeroBr(n.toFixed(2).replace(".", ","));
  }
  const texto = textoDaCelula(valor, formato, fuso, t);
  return texto === "—" ? "" : texto;
}

export function csvDoDetalhamento(
  colunas: readonly ColunaComFormato[],
  linhas: readonly LinhaDoDetalhamento[],
  fuso: string,
  t: (s: string) => string = (s) => s,
): string {
  const cabecalho = colunas.map((c) => c.nome);
  const corpo = linhas.map((l) => colunas.map((c) => valorDoCsv(l[c.chave], c.formato, fuso, t)));
  return `${[cabecalho, ...corpo].map((l) => l.map(celula).join(",")).join("\r\n")}\r\n`;
}

/** `{grafico} - {indicador} - dd-mm-aaaa.csv`, sem `/ \ : * ? " < > |`. `hoje` já vem como dd-mm-aaaa. */
export function nomeDoCsvDoDetalhamento(nomeDoGrafico: string, indicador: string, hoje: string): string {
  const limpo = (s: string): string => s.replace(/[/\\:*?"<>|]/g, "").trim();
  const partes = [limpo(nomeDoGrafico) || "grafico", limpo(indicador)].filter(Boolean);
  return `${partes.join(" - ")} - ${hoje}.csv`;
}

type Armazenamento = Pick<Storage, "getItem" | "setItem">;
const doNavegador = (): Armazenamento | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

/** Colunas guardadas no navegador (T20); ausente, inválido ou a lançar = as `padrao`. */
export function colunasGuardadas(
  graficoId: string,
  disponiveis: readonly ColunaDoDetalhamentoNaTela[],
  armazenamento: Armazenamento | null = doNavegador(),
): string[] {
  const padrao = disponiveis.filter((c) => c.padrao).map((c) => c.chave);
  try {
    const bruto = armazenamento?.getItem(CHAVE_DAS_COLUNAS(graficoId));
    if (!bruto) return padrao;
    const lido: unknown = JSON.parse(bruto);
    if (!Array.isArray(lido)) return padrao;
    const existentes = new Set(disponiveis.map((c) => c.chave));
    const validas = lido.filter((x): x is string => typeof x === "string" && existentes.has(x));
    return validas.length ? validas : padrao;
  } catch {
    return padrao;
  }
}

export function gravarColunas(graficoId: string, colunas: readonly string[], armazenamento: Armazenamento | null = doNavegador()): void {
  try {
    armazenamento?.setItem(CHAVE_DAS_COLUNAS(graficoId), JSON.stringify(colunas));
  } catch {
    // Sem armazenamento (janela privada): a escolha vale só até recarregar.
  }
}

/** As colunas que a janela oferece: as do catálogo (marcadas) e os campos personalizados do assunto (desmarcados). */
export function colunasDoDetalhamento(
  doCatalogo: readonly { chave: string; nome: string; formato?: FormatoDaColuna | null }[],
  camposPersonalizados: readonly { id: string; nome: string; objeto: string }[],
): ColunaDoDetalhamentoNaTela[] {
  return [
    ...doCatalogo.map((c) => ({ ...c, padrao: true })),
    ...camposPersonalizados.map((c) => ({ chave: c.id, nome: c.nome, padrao: false })),
  ];
}

export type Clique = { rotulo?: string; t?: string; serie?: string; dsem?: number; hora?: number };

/**
 * O ponto que o clique define (T19): as variáveis que o clique fixa (o rótulo do eixo X sem tempo; o nome da
 * série com tempo ou além da 1ª variável), o bucket de tempo ou a célula do heatmap. Sem clique, o total.
 */
export function pontoDoClique(r: Resultado, pergunta: Pergunta, clique: Clique = {}): Ponto {
  if (clique.dsem !== undefined && clique.hora !== undefined) return { variaveis: [], diaDaSemana: clique.dsem, hora: clique.hora };
  const comTempo = r.colunas.some((c) => c.papel === "tempo");
  const nVariaveis = pergunta.variaveis.length;
  const primeiraDeSerie = comTempo ? 0 : 1;
  const candidatas = r.linhas.filter((l) => {
    if (clique.t && String(l.t) !== clique.t) return false;
    if (!comTempo && clique.rotulo !== undefined && rotuloDaVariavel(l, 0) !== clique.rotulo) return false;
    if (clique.serie !== undefined && nVariaveis > primeiraDeSerie) {
      const nome = Array.from({ length: nVariaveis - primeiraDeSerie }, (_, k) => rotuloDaVariavel(l, primeiraDeSerie + k)).join(", ");
      if (!clique.serie.startsWith(nome) && !clique.serie.endsWith(nome)) return false;
    }
    return true;
  });
  const linha = candidatas[0];
  const fixas: number[] = [];
  if (!comTempo && nVariaveis > 0 && clique.rotulo !== undefined) fixas.push(0);
  if (clique.serie !== undefined) for (let i = primeiraDeSerie; i < nVariaveis; i++) fixas.push(i);
  const variaveis = linha
    ? fixas.map((i) => ({ id: pergunta.variaveis[i] as string, valor: linha[`v${i}`] === null || linha[`v${i}`] === undefined ? null : String(linha[`v${i}`]) }))
    : [];
  return { variaveis, ...(clique.t ? { t: clique.t } : {}) };
}
