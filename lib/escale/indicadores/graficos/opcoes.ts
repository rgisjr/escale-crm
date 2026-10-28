import { z } from "zod";

export const CALCULOS_DO_FUNIL = ["automatico", "primeira_etapa", "etapa_anterior", "participacao"] as const;
export type CalculoDoFunil = (typeof CALCULOS_DO_FUNIL)[number];

/** As opções de desenho do gráfico (Fases 7C e 7D). A 7E acrescenta chaves com `.extend()`. */
export const opcoesDoGraficoSchema = z
  .object({
    visualizacao: z
      .object({
        valores: z.boolean(),
        legendas: z.boolean(),
        grade: z.boolean(),
        linhaDeMedia: z.boolean(),
        linhaDeMediana: z.boolean(),
      })
      .partial()
      .default({}),
    tabela: z.object({ totais: z.boolean() }).partial().default({}),
    funil: z
      .object({ primeiraEtapa: z.string().max(200).nullable(), calculo: z.enum(CALCULOS_DO_FUNIL) })
      .partial()
      .default({}),
  })
  .passthrough();

export type OpcoesDoGrafico = {
  visualizacao: { valores: boolean; legendas: boolean; grade: boolean; linhaDeMedia: boolean; linhaDeMediana: boolean };
  tabela: { totais: boolean };
  funil: { primeiraEtapa: string | null; calculo: CalculoDoFunil };
};

/** Padrão da Clint (`showDataLabels: false`, `showLegend: true`); grade ligada. Opções inválidas viram o padrão. */
export function opcoesComPadrao(bruto: unknown): OpcoesDoGrafico {
  const lido = opcoesDoGraficoSchema.safeParse(bruto ?? {});
  const o = lido.success ? lido.data : { visualizacao: {}, tabela: {}, funil: {} };
  return {
    visualizacao: {
      valores: o.visualizacao.valores ?? false,
      legendas: o.visualizacao.legendas ?? true,
      grade: o.visualizacao.grade ?? true,
      linhaDeMedia: o.visualizacao.linhaDeMedia ?? false,
      linhaDeMediana: o.visualizacao.linhaDeMediana ?? false,
    },
    tabela: { totais: o.tabela.totais ?? false },
    funil: { primeiraEtapa: o.funil.primeiraEtapa ?? null, calculo: o.funil.calculo ?? "automatico" },
  };
}

/** S8: o gráfico NOVO nasce com Valores, Legendas e Grade ligados (10-015). A leitura de salvos não muda. */
export function opcoesDoGraficoNovo(): OpcoesDoGrafico {
  const o = opcoesComPadrao({});
  return { ...o, visualizacao: { ...o.visualizacao, valores: true } };
}
