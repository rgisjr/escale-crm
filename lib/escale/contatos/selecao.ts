import type { VisaoDeContatos } from "./regras";

/**
 * A SELEÇÃO DA LISTA DE CONTATOS (fork Escale, Fase 2B; decisão B3 do usuário
 * sobre a Clint `index-C8mLn7Gp`). Dois jeitos:
 * - "ids": marcados à mão (a caixinha de cada linha e a do cabeçalho, que marca
 *   só a página); valem entre páginas, até 1.000;
 * - "todos": todos os resultados do filtro, ou os N primeiros ("Selecionar
 *   [N]"), menos os desmarcados (`excluidos`, os `ignoredIds` da Clint).
 * A ação nunca recebe a lista inteira de ids no modo "todos": vai o filtro.
 */
export const IDS_MAX = 1000;

export type Selecao =
  | { tipo: "ids"; ids: readonly string[] }
  | { tipo: "todos"; quantidade: number | null; excluidos: readonly string[] };

export const SEM_SELECAO: Selecao = { tipo: "ids", ids: [] };
export const SELECIONAR_TODOS: Selecao = { tipo: "todos", quantidade: null, excluidos: [] };

const noAlcance = (s: Extract<Selecao, { tipo: "todos" }>, indice: number) =>
  s.quantidade === null || indice < s.quantidade;

export function totalSelecionado(s: Selecao, total: number): number {
  if (s.tipo === "ids") return s.ids.length;
  const base = s.quantidade === null ? total : Math.min(s.quantidade, total);
  return Math.max(0, base - s.excluidos.length);
}

export function linhaMarcada(s: Selecao, id: string, indice: number): boolean {
  if (s.tipo === "ids") return s.ids.includes(id);
  return noAlcance(s, indice) && !s.excluidos.includes(id);
}

export function alternarLinha(s: Selecao, id: string, indice: number, marcar: boolean): Selecao {
  if (s.tipo === "ids") {
    if (!marcar) return { tipo: "ids", ids: s.ids.filter((x) => x !== id) };
    return s.ids.includes(id) || s.ids.length >= IDS_MAX ? s : { tipo: "ids", ids: [...s.ids, id] };
  }
  if (!noAlcance(s, indice)) return s;
  if (marcar) return { ...s, excluidos: s.excluidos.filter((x) => x !== id) };
  return s.excluidos.includes(id) || s.excluidos.length >= IDS_MAX
    ? s
    : { ...s, excluidos: [...s.excluidos, id] };
}

/** A caixinha do cabeçalho: marcada, desmarcada ou "indeterminada" (parte da página). */
export function estadoDaPagina(
  s: Selecao,
  linhas: ReadonlyArray<{ id: string }>,
  primeiro: number,
): boolean | "indeterminada" {
  if (linhas.length === 0) return false;
  const marcadas = linhas.filter((l, i) => linhaMarcada(s, l.id, primeiro + i)).length;
  if (marcadas === 0) return false;
  return marcadas === linhas.length ? true : "indeterminada";
}

export function marcarPagina(
  s: Selecao,
  linhas: ReadonlyArray<{ id: string }>,
  primeiro: number,
  marcar: boolean,
): Selecao {
  return linhas.reduce<Selecao>((acc, l, i) => alternarLinha(acc, l.id, primeiro + i, marcar), s);
}

/** "Selecionar [N]" (Clint): N ≥ total é "todos"; 0 ou vazio limpa. */
export function selecionarQuantidade(n: number, total: number): Selecao {
  if (!Number.isFinite(n) || n <= 0) return SEM_SELECAO;
  if (n >= total) return SELECIONAR_TODOS;
  return { tipo: "todos", quantidade: Math.floor(n), excluidos: [] };
}

export const todosMarcados = (s: Selecao): boolean =>
  s.tipo === "todos" && s.quantidade === null && s.excluidos.length === 0;

export type AlvoDaAcao =
  | { tipo: "ids"; ids: string[] }
  | {
      tipo: "filtro";
      q?: string;
      v: VisaoDeContatos;
      f?: string;
      quantidade: number | null;
      excluidos: string[];
    };

export function alvoDaSelecao(
  s: Selecao,
  consulta: { q?: string; v: VisaoDeContatos; f?: string | null },
): AlvoDaAcao {
  if (s.tipo === "ids") return { tipo: "ids", ids: [...s.ids] };
  const q = consulta.q?.trim();
  return {
    tipo: "filtro",
    ...(q ? { q } : {}),
    v: consulta.v,
    ...(consulta.f ? { f: consulta.f } : {}),
    quantidade: s.quantidade,
    excluidos: [...s.excluidos],
  };
}
