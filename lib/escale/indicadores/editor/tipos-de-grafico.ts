/** Os tipos de gráfico do editor, seus limites e o que cada um mostra em Visualização (fork Escale, Fase 7D). */
import { INDICADORES_POR_PERGUNTA_MAX } from "../catalogo/tipos";
import type { TipoPrincipal } from "../graficos/tipos";

export type IconeDoTipo = TipoPrincipal;
export type ChaveDeVisualizacao = "valores" | "legendas" | "grade" | "linhaDeMedia" | "linhaDeMediana";

/** A ordem de 10-013; a 7E acrescenta os 6 depois de "painel_de_kpi". */
export const TIPOS_DO_EDITOR: ReadonlyArray<{ tipo: TipoPrincipal; rotulo: string; icone: IconeDoTipo }> = [
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
];
export const TIPO_PADRAO: TipoPrincipal = "linha";

export const rotuloDoTipo = (t: TipoPrincipal): string => TIPOS_DO_EDITOR.find((x) => x.tipo === t)?.rotulo ?? t;

/** S14: Pizza, Donut, Funil e Painel de KPI = 1; Número = 2; os outros = o teto da pergunta. */
export function limiteDoTipo(t: TipoPrincipal): number {
  if (t === "pizza" || t === "donut" || t === "funil" || t === "painel_de_kpi") return 1;
  if (t === "numero") return 2;
  return INDICADORES_POR_PERGUNTA_MAX;
}

const CARTESIANOS: readonly ChaveDeVisualizacao[] = ["valores", "legendas", "grade", "linhaDeMedia", "linhaDeMediana"];
/** S9: tabela e número não mostram nada (a 7E põe as projeções). */
export const VISUALIZACAO_POR_TIPO: Record<TipoPrincipal, readonly ChaveDeVisualizacao[]> = {
  linha: CARTESIANOS,
  area: CARTESIANOS,
  barra: CARTESIANOS,
  barra_empilhada: CARTESIANOS,
  pizza: ["valores", "legendas"],
  donut: ["valores", "legendas"],
  funil: ["valores", "legendas"],
  painel_de_kpi: ["valores", "legendas"],
  tabela: [],
  numero: [],
};

/** Gancho da 7E: ela põe "metas" na frente e "opcoes_do_grafico" antes de "ordenacao". */
export const ACORDEOES_DAS_OPCOES = ["visualizacao", "ordenacao"] as const;
export const usaTotais = (t: TipoPrincipal): boolean => t === "tabela";
