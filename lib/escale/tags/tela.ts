import type { LinhaDeVocabulario } from "@/lib/schemas/tags";
import { chaveDaEtiqueta } from "@/lib/tags/cor-da-etiqueta";

/** Uma linha da tabela de Tags da casca (print docs/escale/prints/tags/01-tela.jpg). */
export type LinhaDaTela = {
  tag: string;
  cor: string | null;
  descricao: string | null;
  emUso: number;
  criadaEm: string | null;
  criadaPor: string | null;
};

export type PeriodoDeCriacao = "todos" | "7" | "30" | "90";

type Origem = { criadaEm: string | null; criadaPor: string | null };

function origens(settings: unknown): Map<string, Origem> {
  const mapa = new Map<string, Origem>();
  const lista = (settings as { tags?: unknown } | null | undefined)?.tags;
  if (!Array.isArray(lista)) return mapa;
  for (const e of lista) {
    if (typeof e !== "object" || e === null) continue;
    const o = e as Record<string, unknown>;
    if (typeof o.tag !== "string") continue;
    mapa.set(chaveDaEtiqueta(o.tag), {
      criadaEm: typeof o.criada_em === "string" ? o.criada_em : null,
      criadaPor: typeof o.criada_por === "string" ? o.criada_por : null,
    });
  }
  return mapa;
}

export function montarLinhas(vocabulario: readonly LinhaDeVocabulario[], settings: unknown): LinhaDaTela[] {
  const quem = origens(settings);
  const linhas = vocabulario.map((v) => {
    const o = quem.get(chaveDaEtiqueta(v.tag)) ?? { criadaEm: null, criadaPor: null };
    return { tag: v.tag, cor: v.cor, descricao: v.descricao, emUso: v.uso_em_contatos, ...o };
  });
  return linhas.sort((a, b) => {
    if (a.criadaEm && b.criadaEm) return b.criadaEm.localeCompare(a.criadaEm);
    if (a.criadaEm) return -1;
    if (b.criadaEm) return 1;
    return a.tag.localeCompare(b.tag, "pt-BR");
  });
}

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const DIA = 86_400_000;

export function filtrarLinhas(
  linhas: readonly LinhaDaTela[],
  filtro: { busca: string; periodo: PeriodoDeCriacao; criadaPor: string },
  agora: Date,
): LinhaDaTela[] {
  const termo = semAcento(filtro.busca.trim());
  const desde = filtro.periodo === "todos" ? null : agora.getTime() - Number(filtro.periodo) * DIA;
  return linhas.filter((l) => {
    if (termo && !semAcento(l.tag).includes(termo)) return false;
    if (desde !== null && (!l.criadaEm || Date.parse(l.criadaEm) < desde)) return false;
    if (filtro.criadaPor && l.criadaPor !== filtro.criadaPor) return false;
    return true;
  });
}

export function paginar<T>(itens: readonly T[], pagina: number, porPagina: number): T[] {
  const inicio = (Math.max(1, pagina) - 1) * porPagina;
  return itens.slice(inicio, inicio + porPagina);
}

/** `idioma` é a tag do usuário (`useTagDeIdioma()`); o fuso é sempre o de São Paulo. */
export function dataBr(iso: string | null, idioma: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(idioma, { timeZone: "America/Sao_Paulo" });
}
