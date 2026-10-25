import {
  SITUACOES_DA_PROSPECCAO,
  type FiltrosDaProspeccao,
  type SituacaoDaProspeccao,
} from "./tipos";

/**
 * OS FILTROS DA LISTA DE PROSPECÇÕES (fork Escale, Fase 8D; D7): busca no nome
 * e situação. Ficam no estado da tela; vão ao servidor como `q` e `s`.
 */
export const temFiltroDaProspeccao = (f: FiltrosDaProspeccao): boolean =>
  !!f.busca?.trim() || !!f.situacoes?.length;

export function consultaDaLista(f: FiltrosDaProspeccao, pagina: number, porPagina: number): string {
  const p = new URLSearchParams({ p: String(pagina), n: String(porPagina) });
  const busca = f.busca?.trim();
  if (busca) p.set("q", busca);
  if (f.situacoes?.length) p.set("s", f.situacoes.join(","));
  return p.toString();
}

/** O padrão do `ilike`: `%`, `_` e `\` valem como texto (o escape padrão do Postgres é `\`). */
export function padraoDaBusca(busca: string): string {
  return `%${busca.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

const VALIDAS: ReadonlySet<string> = new Set(SITUACOES_DA_PROSPECCAO);

/** `s=pausada,rascunho` → a lista; vazio → `[]`; algum valor desconhecido → `null` (422). */
export function situacoesDoTexto(texto: string | undefined): SituacaoDaProspeccao[] | null {
  if (!texto) return [];
  const partes = texto
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (partes.some((s) => !VALIDAS.has(s))) return null;
  return [...new Set(partes)] as SituacaoDaProspeccao[];
}
