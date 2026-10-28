/** Metas dos indicadores (fork Escale, Fase 7E, T11) — regras puras. */
import { CORES_DA_META, corDaMeta } from "./cores";
import type { OpcoesDoGrafico } from "./opcoes";

export { CORES_DA_META, corDaMeta };

/** A meta do indicador (`i0`, `c0`…), só quando as metas estão ligadas. */
export function metaDoIndicador(o: OpcoesDoGrafico, indicador: string): { valor: number; visivel: boolean } | null {
  if (!o.metas.ligadas) return null;
  const achada = o.metas.itens.find((m) => m.indicador === indicador);
  return achada ? { valor: achada.valor, visivel: achada.visivel } : null;
}

/** 34 de 25 = 136; meta zero ou negativa não tem percentual. */
export const percentualDaMeta = (valor: number, meta: number): number | null => (meta > 0 ? (100 * valor) / meta : null);

export const atingiu = (valor: number, meta: number): boolean => valor >= meta;

export function faixaDeSaude(
  pct: number | null,
  faixas: { saudavel: number; alerta: number },
): "saudavel" | "alerta" | "critico" | null {
  if (pct === null) return null;
  if (pct >= faixas.saudavel) return "saudavel";
  return pct >= faixas.alerta ? "alerta" : "critico";
}
