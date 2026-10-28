/** Tipos e limites dos gráficos do painel de Indicadores (fork Escale, Fase 7C). */
export const TIPOS_PRINCIPAIS = [
  "linha",
  "area",
  "barra",
  "barra_empilhada",
  "pizza",
  "donut",
  "funil",
  "tabela",
  "numero",
  "painel_de_kpi",
] as const;
export type TipoPrincipal = (typeof TIPOS_PRINCIPAIS)[number];
export const ehTipoPrincipal = (tipo: string): tipo is TipoPrincipal =>
  (TIPOS_PRINCIPAIS as readonly string[]).includes(tipo);

export const GRAFICOS_POR_PAINEL_MAX = 30;
export const COLUNAS_DA_GRADE = 24;
export const ALTURA_DA_LINHA = 40;
export const ESPACO_DA_GRADE = 12;
export const TAMANHO_MINIMO = 2;
export const LINHAS_DA_TABELA_NO_PAINEL = 5000;
export const POR_PAGINA_DA_TABELA = 50;

export type LayoutDoGrafico = { x: number; y: number; w: number; h: number };
export type GraficoDoPainel = {
  id: string;
  nome: string;
  descricao: string | null;
  /** O do banco; fora de `TIPOS_PRINCIPAIS` = "Tipo de gráfico não suportado.". */
  tipo: string;
  layout: LayoutDoGrafico;
  /** Validado no card com `perguntaSchema`. */
  pergunta: unknown;
  /** Validado com `opcoesDoGraficoSchema`. */
  opcoes: unknown;
};

/** Layout lido do banco: inteiros, `w` 2–24, `h` ≥ 2, `x + w ≤ 24`. Inválido vai para o fim (a compactação sobe). */
export function layoutValido(bruto: unknown): LayoutDoGrafico {
  const l = (bruto ?? {}) as Record<string, unknown>;
  const inteiro = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
  if (
    inteiro(l.x) &&
    inteiro(l.y) &&
    inteiro(l.w) &&
    inteiro(l.h) &&
    l.x >= 0 &&
    l.y >= 0 &&
    l.w >= TAMANHO_MINIMO &&
    l.w <= COLUNAS_DA_GRADE &&
    l.h >= TAMANHO_MINIMO &&
    l.x + l.w <= COLUNAS_DA_GRADE
  ) {
    return { x: l.x, y: l.y, w: l.w, h: l.h };
  }
  return { x: 0, y: 9999, w: 6, h: 4 };
}
