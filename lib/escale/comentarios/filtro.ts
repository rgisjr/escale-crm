import type { OperadorDoFiltro } from "./constantes";
import type { FiltroDoCaminho } from "./schema";

/** FORK ESCALE · Fase 10D (D3): o filtro de palavras com os operadores da Clint. */
export interface CondicaoDoFiltro {
  operador: OperadorDoFiltro;
  valor: string;
}
export type FiltroLido =
  | { modo: "qualquer" }
  | { modo: "palavras"; condicoes: CondicaoDoFiltro[]; combinar: "qualquer" | "todas" };

/** Mesma normalização de `lib/automation/palavra-chave.ts` (um teste garante as duas iguais). */
export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

const escaparRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** O formato da 10B (`palavras`) vira `contem` em cada palavra; `condicoes` vem depois delas. Vazias somem. */
export function lerFiltro(filtro: FiltroDoCaminho): FiltroLido {
  if (filtro.modo === "qualquer") return { modo: "qualquer" };
  const antigas: CondicaoDoFiltro[] = (filtro.palavras ?? []).map((valor) => ({ operador: "contem", valor }));
  const condicoes = [...antigas, ...(filtro.condicoes ?? [])].filter((c) => c.valor.trim() !== "");
  return { modo: "palavras", condicoes, combinar: filtro.combinar };
}

export function casaComCondicao(texto: string, c: CondicaoDoFiltro): boolean {
  const t = normalizar(texto);
  const v = normalizar(c.valor);
  if (v === "") return false;
  switch (c.operador) {
    case "igual":
      return t === v;
    case "contem":
      return t.includes(v);
    case "comeca_com":
      return t.startsWith(v);
    case "termina_com":
      return t.endsWith(v);
    case "nao_contem":
      return !t.includes(v);
    case "palavra_inteira":
      return new RegExp(`(^|[^\\p{L}\\p{N}])${escaparRegex(v)}($|[^\\p{L}\\p{N}])`, "u").test(t);
  }
}

/** Positivas por `combinar`; `nao_contem` sempre bloqueia. Sem positiva → false (o schema recusa salvar assim). */
export function casaComFiltro(texto: string, filtro: FiltroDoCaminho): boolean {
  const lido = lerFiltro(filtro);
  if (lido.modo === "qualquer") return true;
  const positivas = lido.condicoes.filter((c) => c.operador !== "nao_contem");
  const bloqueios = lido.condicoes.filter((c) => c.operador === "nao_contem");
  if (positivas.length === 0) return false;
  if (bloqueios.some((b) => !casaComCondicao(texto, b))) return false;
  const casa = (c: CondicaoDoFiltro) => casaComCondicao(texto, c);
  return lido.combinar === "todas" ? positivas.every(casa) : positivas.some(casa);
}
