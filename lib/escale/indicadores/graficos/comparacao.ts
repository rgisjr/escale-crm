/** Comparação com o período anterior (fork Escale, Fase 7E) — regras puras. */
import type { Resultado } from "../motor/executar";

type Linha = Record<string, unknown>;

/** Com tempo, o bucket de índice `i` do atual casa com o de índice `i` do anterior; sem tempo, casa pelas variáveis. */
export function alinharComparacao(r: Resultado): { anteriorPorIndice: Map<number, Linha>; anteriorPorChave: Map<string, Linha> } | null {
  if (!r.comparacao) return null;
  const comTempo = r.colunas.some((c) => c.papel === "tempo");
  const anteriorPorIndice = new Map<number, Linha>();
  const anteriorPorChave = new Map<string, Linha>();
  if (comTempo) {
    [...r.comparacao.linhas]
      .sort((a, b) => String(a.t).localeCompare(String(b.t)))
      .forEach((l, i) => anteriorPorIndice.set(i, l));
  } else {
    for (const l of r.comparacao.linhas) anteriorPorChave.set(chaveDaLinha(l), l);
  }
  return { anteriorPorIndice, anteriorPorChave };
}

/** v0[,v1] da linha, para casar atual e anterior sem tempo. */
export const chaveDaLinha = (l: Linha): string => [l.v0, l.v1].map((v) => (v === null || v === undefined ? "" : String(v))).join("|");

/** (atual − anterior) ÷ |anterior| × 100; anterior ausente ou zero = sem variação ("Sem dados no período anterior"). */
export function variacaoPercentual(atual: number, anterior: number | null): number | null {
  if (anterior === null || anterior === 0) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

export const rotuloDoAnterior = (nome: string, t: (s: string) => string = (s) => s): string =>
  `${nome} (${t("Período anterior")})`;
