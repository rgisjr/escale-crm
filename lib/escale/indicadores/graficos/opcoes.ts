import { z } from "zod";

export const CALCULOS_DO_FUNIL = ["automatico", "primeira_etapa", "etapa_anterior", "participacao"] as const;
export type CalculoDoFunil = (typeof CALCULOS_DO_FUNIL)[number];
export const CASAS_DECIMAIS = [0, 1, 2] as const;
export const CORES_DO_FUNIL = ["iguais", "degrade", "por_etapa"] as const;
export type CoresDoFunil = (typeof CORES_DO_FUNIL)[number];
export const DESTAQUES_DO_FUNIL = ["valor", "percentual"] as const;
export const FORMATOS_DOS_NUMEROS = ["completo", "compacto"] as const;
export const ESCALAS_DO_HEATMAP = ["linear", "percentil"] as const;
export const JANELAS_DO_HEATMAP = ["24h", "comercial"] as const;
export const FORMATOS_DA_BARRA_100 = ["resumo", "por_data"] as const;

/** As opções de desenho do gráfico (Fases 7C, 7D e 7E). */
export const opcoesDoGraficoSchema = z
  .object({
    visualizacao: z
      .object({
        valores: z.boolean(),
        legendas: z.boolean(),
        grade: z.boolean(),
        linhaDeMedia: z.boolean(),
        linhaDeMediana: z.boolean(),
        projecaoNormal: z.boolean(),
        projecaoDiasUteis: z.boolean(),
      })
      .partial()
      .default({}),
    tabela: z.object({ totais: z.boolean() }).partial().default({}),
    funil: z
      .object({
        primeiraEtapa: z.string().max(200).nullable(),
        calculo: z.enum(CALCULOS_DO_FUNIL),
        ultimaEtapa: z.string().max(200).nullable(),
        etapasExibidas: z.array(z.string().max(200)).max(200).nullable(),
        casasDecimais: z.union([z.literal(0), z.literal(1), z.literal(2)]),
        destacarMaiorQueda: z.boolean(),
        metaDeConversao: z.object({ ligada: z.boolean(), taxaMinima: z.number().min(0).max(100) }).partial(),
        destaque: z.enum(DESTAQUES_DO_FUNIL),
        formatoDosNumeros: z.enum(FORMATOS_DOS_NUMEROS),
        cores: z.enum(CORES_DO_FUNIL),
        ultimaEmVerde: z.boolean(),
        gargalo: z.boolean(),
      })
      .partial()
      .default({}),
    metas: z
      .object({
        ligadas: z.boolean(),
        itens: z
          .array(z.object({ indicador: z.string().max(80), valor: z.number().finite(), visivel: z.boolean() }).strict())
          .max(8),
      })
      .partial()
      .default({}),
    ranking: z.object({ faixasForaDaMeta: z.array(z.string().max(200)).max(50) }).partial().default({}),
    heatmap: z.object({ escala: z.enum(ESCALAS_DO_HEATMAP), janela: z.enum(JANELAS_DO_HEATMAP) }).partial().default({}),
    barra100: z.object({ formato: z.enum(FORMATOS_DA_BARRA_100) }).partial().default({}),
    numeroAvancado: z
      .object({ faixas: z.object({ saudavel: z.number().min(0).max(1000), alerta: z.number().min(0).max(1000) }).partial() })
      .partial()
      .default({}),
  })
  .passthrough();

export type MetaDoGrafico = { indicador: string; valor: number; visivel: boolean };
export type OpcoesDoGrafico = {
  visualizacao: {
    valores: boolean;
    legendas: boolean;
    grade: boolean;
    linhaDeMedia: boolean;
    linhaDeMediana: boolean;
    projecaoNormal: boolean;
    projecaoDiasUteis: boolean;
  };
  tabela: { totais: boolean };
  funil: {
    primeiraEtapa: string | null;
    calculo: CalculoDoFunil;
    ultimaEtapa: string | null;
    etapasExibidas: string[] | null;
    casasDecimais: 0 | 1 | 2;
    destacarMaiorQueda: boolean;
    metaDeConversao: { ligada: boolean; taxaMinima: number };
    destaque: (typeof DESTAQUES_DO_FUNIL)[number];
    formatoDosNumeros: (typeof FORMATOS_DOS_NUMEROS)[number];
    cores: CoresDoFunil;
    ultimaEmVerde: boolean;
    gargalo: boolean;
  };
  metas: { ligadas: boolean; itens: MetaDoGrafico[] };
  ranking: { faixasForaDaMeta: string[] };
  heatmap: { escala: (typeof ESCALAS_DO_HEATMAP)[number]; janela: (typeof JANELAS_DO_HEATMAP)[number] };
  barra100: { formato: (typeof FORMATOS_DA_BARRA_100)[number] };
  numeroAvancado: { faixas: { saudavel: number; alerta: number } };
};

const VAZIO = { visualizacao: {}, tabela: {}, funil: {}, metas: {}, ranking: {}, heatmap: {}, barra100: {}, numeroAvancado: {} };

/** Padrão da Clint (`showDataLabels: false`, `showLegend: true`); grade ligada. Opções inválidas viram o padrão. */
export function opcoesComPadrao(bruto: unknown): OpcoesDoGrafico {
  const lido = opcoesDoGraficoSchema.safeParse(bruto ?? {});
  const o = (lido.success ? lido.data : VAZIO) as z.infer<typeof opcoesDoGraficoSchema>;
  const f = o.funil as Partial<OpcoesDoGrafico["funil"]>;
  const v = o.visualizacao;
  return {
    visualizacao: {
      valores: v.valores ?? false,
      legendas: v.legendas ?? true,
      grade: v.grade ?? true,
      linhaDeMedia: v.linhaDeMedia ?? false,
      linhaDeMediana: v.linhaDeMediana ?? false,
      projecaoNormal: v.projecaoNormal ?? false,
      projecaoDiasUteis: v.projecaoDiasUteis ?? false,
    },
    tabela: { totais: o.tabela.totais ?? false },
    funil: {
      primeiraEtapa: f.primeiraEtapa ?? null,
      calculo: f.calculo ?? "automatico",
      ultimaEtapa: f.ultimaEtapa ?? null,
      etapasExibidas: f.etapasExibidas ?? null,
      casasDecimais: f.casasDecimais ?? 0,
      destacarMaiorQueda: f.destacarMaiorQueda ?? false,
      metaDeConversao: { ligada: f.metaDeConversao?.ligada ?? false, taxaMinima: f.metaDeConversao?.taxaMinima ?? 0 },
      destaque: f.destaque ?? "valor",
      formatoDosNumeros: f.formatoDosNumeros ?? "completo",
      cores: f.cores ?? "por_etapa",
      ultimaEmVerde: f.ultimaEmVerde ?? false,
      gargalo: f.gargalo ?? false,
    },
    metas: { ligadas: o.metas.ligadas ?? false, itens: o.metas.itens ?? [] },
    ranking: { faixasForaDaMeta: o.ranking.faixasForaDaMeta ?? [] },
    heatmap: { escala: o.heatmap.escala ?? "linear", janela: o.heatmap.janela ?? "24h" },
    barra100: { formato: o.barra100.formato ?? "resumo" },
    numeroAvancado: {
      faixas: { saudavel: o.numeroAvancado.faixas?.saudavel ?? 100, alerta: o.numeroAvancado.faixas?.alerta ?? 70 },
    },
  };
}

/** S8: o gráfico NOVO nasce com Valores, Legendas e Grade ligados (10-015). A leitura de salvos não muda. */
export function opcoesDoGraficoNovo(): OpcoesDoGrafico {
  const o = opcoesComPadrao({});
  return { ...o, visualizacao: { ...o.visualizacao, valores: true } };
}
