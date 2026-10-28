import { z } from "zod";

/** As opções de desenho do gráfico (Fase 7C): o mínimo que o desenho lê. A 7D acrescenta chaves com `.extend()`. */
export const opcoesDoGraficoSchema = z
  .object({
    visualizacao: z.object({ valores: z.boolean(), legendas: z.boolean(), grade: z.boolean() }).partial().default({}),
    tabela: z.object({ totais: z.boolean() }).partial().default({}),
  })
  .passthrough();

export type OpcoesDoGrafico = {
  visualizacao: { valores: boolean; legendas: boolean; grade: boolean };
  tabela: { totais: boolean };
};

/** Padrão da Clint (`showDataLabels: false`, `showLegend: true`); grade ligada. Opções inválidas viram o padrão. */
export function opcoesComPadrao(bruto: unknown): OpcoesDoGrafico {
  const lido = opcoesDoGraficoSchema.safeParse(bruto ?? {});
  const o = lido.success ? lido.data : { visualizacao: {}, tabela: {} };
  return {
    visualizacao: {
      valores: o.visualizacao.valores ?? false,
      legendas: o.visualizacao.legendas ?? true,
      grade: o.visualizacao.grade ?? true,
    },
    tabela: { totais: o.tabela.totais ?? false },
  };
}
