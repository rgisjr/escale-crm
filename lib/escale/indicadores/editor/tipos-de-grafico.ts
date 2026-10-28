/** Os tipos de gráfico do editor, seus limites e o que cada um mostra em Visualização (fork Escale, Fases 7D e 7E). */
import { INDICADORES_POR_PERGUNTA_MAX } from "../catalogo/tipos";
import type { TipoDeGrafico } from "../graficos/tipos";

export type IconeDoTipo = TipoDeGrafico;
export type ChaveDeVisualizacao =
  | "valores"
  | "legendas"
  | "grade"
  | "linhaDeMedia"
  | "linhaDeMediana"
  | "projecaoNormal"
  | "projecaoDiasUteis";

/** A ordem de 10-013 e de 10-041: os 6 novos vêm depois de "painel_de_kpi" (sem o selo "novo", T21). */
export const TIPOS_DO_EDITOR: ReadonlyArray<{ tipo: TipoDeGrafico; rotulo: string; icone: IconeDoTipo }> = [
  { tipo: "linha", rotulo: "Linha", icone: "linha" },
  { tipo: "area", rotulo: "Área", icone: "area" },
  { tipo: "barra", rotulo: "Barra", icone: "barra" },
  { tipo: "barra_empilhada", rotulo: "Barra Empilhada", icone: "barra_empilhada" },
  { tipo: "pizza", rotulo: "Pizza", icone: "pizza" },
  { tipo: "donut", rotulo: "Donut", icone: "donut" },
  { tipo: "funil", rotulo: "Funil", icone: "funil" },
  { tipo: "tabela", rotulo: "Tabela", icone: "tabela" },
  { tipo: "numero", rotulo: "Número", icone: "numero" },
  { tipo: "painel_de_kpi", rotulo: "Painel de KPI", icone: "painel_de_kpi" },
  { tipo: "ranking", rotulo: "Ranking de distribuição", icone: "ranking" },
  { tipo: "barra_100", rotulo: "Barra 100% empilhada", icone: "barra_100" },
  { tipo: "numero_avancado", rotulo: "Número avançado", icone: "numero_avancado" },
  { tipo: "heatmap", rotulo: "Heatmap dia × hora", icone: "heatmap" },
  { tipo: "sankey", rotulo: "Sankey de fluxo", icone: "sankey" },
  { tipo: "divisor", rotulo: "Divisor", icone: "divisor" },
];
export const TIPO_PADRAO: TipoDeGrafico = "linha";

/** Os rótulos como tabela, para o `t()` da tela achar o espanhol de cada um. */
export const ROTULO_DO_TIPO_DO_GRAFICO: Record<TipoDeGrafico, string> = Object.fromEntries(
  TIPOS_DO_EDITOR.map((x) => [x.tipo, x.rotulo]),
) as Record<TipoDeGrafico, string>;
export const rotuloDoTipo = (t: TipoDeGrafico): string => ROTULO_DO_TIPO_DO_GRAFICO[t];

/** S14 e T22: Pizza, Donut, Funil, Painel de KPI e os 6 novos = 1; Número = 2; os outros = o teto da pergunta. O Divisor não usa indicadores. */
export function limiteDoTipo(t: TipoDeGrafico): number {
  if (t === "divisor") return 0;
  if (t === "numero") return 2;
  if (["pizza", "donut", "funil", "painel_de_kpi", "ranking", "barra_100", "numero_avancado", "heatmap", "sankey"].includes(t)) return 1;
  return INDICADORES_POR_PERGUNTA_MAX;
}

const CARTESIANOS: readonly ChaveDeVisualizacao[] = [
  "valores",
  "legendas",
  "grade",
  "linhaDeMedia",
  "linhaDeMediana",
  "projecaoNormal",
  "projecaoDiasUteis",
];
const PROJECOES: readonly ChaveDeVisualizacao[] = ["projecaoNormal", "projecaoDiasUteis"];
/** T24 (prints 10-040, 10-042, 10-045, 10-046, 10-048): Visualização de cada tipo. */
export const VISUALIZACAO_POR_TIPO: Record<TipoDeGrafico, readonly ChaveDeVisualizacao[]> = {
  linha: CARTESIANOS,
  area: CARTESIANOS,
  barra: CARTESIANOS,
  barra_empilhada: CARTESIANOS,
  barra_100: CARTESIANOS,
  pizza: ["valores", "legendas"],
  donut: ["valores", "legendas"],
  funil: ["valores", "legendas"],
  painel_de_kpi: ["valores", "legendas", ...PROJECOES],
  tabela: PROJECOES,
  numero: PROJECOES,
  numero_avancado: PROJECOES,
  ranking: [],
  heatmap: [],
  sankey: [],
  divisor: [],
};

/** As seções de "Opções do gráfico" de cada tipo (10-042, 10-045, 10-068, 10-069 e as provisórias). */
export type SecaoDeOpcoes = "comparacao" | "funil" | "ranking" | "heatmap" | "barra100";
export function opcoesDoTipo(t: TipoDeGrafico): readonly SecaoDeOpcoes[] {
  switch (t) {
    case "linha":
    case "area":
    case "barra":
    case "barra_empilhada":
    case "painel_de_kpi":
    case "numero_avancado":
      return ["comparacao"];
    case "barra_100":
      return ["comparacao", "barra100"];
    case "funil":
      return ["funil"];
    case "ranking":
      return ["ranking"];
    case "heatmap":
      return ["heatmap"];
    default:
      return [];
  }
}

const COM_META: readonly TipoDeGrafico[] = ["linha", "area", "barra", "barra_empilhada", "painel_de_kpi", "tabela", "numero_avancado"];
/** T11: Pizza, Donut, Funil, Ranking, Heatmap, Sankey, Divisor (e Número, Barra 100%) não suportam metas. */
export const suportaMetas = (t: TipoDeGrafico): boolean => COM_META.includes(t);

/** Gancho da 7E: "metas" na frente e "opcoes_do_grafico" antes de "ordenacao" (10-040, 10-068). */
export const ACORDEOES_DAS_OPCOES = ["metas", "visualizacao", "opcoes_do_grafico", "ordenacao"] as const;
export const usaTotais = (t: TipoDeGrafico): boolean => t === "tabela";
