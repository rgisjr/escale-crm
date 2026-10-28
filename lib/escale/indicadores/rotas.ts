/** As rotas de Indicadores da casca (fork Escale, Fase 7B). */
export const ROTA_DA_LISTA_DE_PAINEIS = "/app/metrics";
/** O editor de gráfico nasce na 7D. */
export const ROTA_DO_EDITOR = "/app/metrics/explorar";
/** A página Desempenho mudou para o grupo "Agente de IA" (PRD 7, decisão 8). */
export const ROTA_DO_DESEMPENHO = "/app/ai/desempenho";

export function rotaDoPainel(id: string): string {
  return `${ROTA_DA_LISTA_DE_PAINEIS}/${encodeURIComponent(id)}`;
}
