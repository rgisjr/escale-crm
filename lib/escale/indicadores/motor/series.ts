/** Linhas cruas do banco → o formato que os gráficos desenham (Fase 7A). */
import type { Coluna } from "./sql";

export type Linha = Record<string, unknown>;
export interface Tabela {
  colunas: Coluna[];
  linhas: Linha[];
  avisos: "moedas_diferentes"[];
}

const numero = (valor: unknown): number | null => {
  if (valor === null || valor === undefined) return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
};

/**
 * `moedas > 1` numa linha significa que a soma misturou moedas: os indicadores monetários dessa
 * linha viram `null` (sem número errado na tela) e o resultado leva o aviso `moedas_diferentes`.
 */
export function montarTabela(colunas: Coluna[], linhasCruas: readonly unknown[][], monetarios: ReadonlySet<string>): Tabela {
  const saida = colunas.filter((c) => c.papel !== "moedas");
  const posicaoDeMoedas = colunas.findIndex((c) => c.papel === "moedas");
  let misturou = false;
  const linhas = linhasCruas.map((cruas) => {
    const moedas = posicaoDeMoedas >= 0 ? (numero(cruas[posicaoDeMoedas]) ?? 0) : 0;
    const linha: Linha = {};
    colunas.forEach((coluna, i) => {
      if (coluna.papel === "moedas") return;
      if (coluna.papel !== "indicador") {
        linha[coluna.chave] = cruas[i] ?? null;
        return;
      }
      const mistura = moedas > 1 && monetarios.has(coluna.chave);
      misturou ||= mistura;
      linha[coluna.chave] = mistura ? null : numero(cruas[i]);
    });
    return linha;
  });
  return { colunas: saida, linhas, avisos: misturou ? ["moedas_diferentes"] : [] };
}
