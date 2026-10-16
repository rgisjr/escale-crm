import type { z } from "zod";

import { filtersFromParams, filtersToParams, marcadoresDoFiltro, type LeadFilters } from "@/lib/kanban/filters";

import { STATUS_DO_NEGOCIO, ehStatusPadrao, enxugar, filtrosDoQuadroSchema, normalizarStatus, type FiltrosDoQuadro } from "./tipos";

/**
 * OS FILTROS DO QUADRO NA URL (fork Escale, Fase 1D) — o link do quadro com
 * filtro continua compartilhável e sobrevive ao F5.
 *
 * As chaves do original (`owner`, `tag`, `modo`, `q`, `overdue`, `motivo`,
 * `categoria`) continuam as mesmas, lidas e escritas pelas funções do original
 * (`lib/kanban/filters.ts`): um link antigo abre igual. O status vai em `st`
 * (lista: `st=open,won`; ausente = "Em aberto"), e um `status=` de link antigo
 * ainda vale quando não há `st`. O resto vai como JSON em `f`, validado pelo
 * schema: parâmetro colado à mão que não passa vira "sem filtro", nunca erro.
 * `fs` é o filtro salvo aplicado.
 */
export const PARAM_STATUS = "st";
export const PARAM_AVANCADOS = "f";
export const PARAM_FILTRO_SALVO = "fs";

type Busca = { get(chave: string): string | null; getAll?: (chave: string) => string[] };

const avancadosSchema = filtrosDoQuadroSchema.pick({
  criadoEm: true,
  valor: true,
  conversa: true,
  campos: true,
  atividadesConcluidas: true,
  tempoNaEtapa: true,
  tempoDesdeEntrada: true,
  ordem: true,
});
type Avancados = z.infer<typeof avancadosSchema>;
const CHAVES_AVANCADAS = Object.keys(avancadosSchema.shape) as Array<keyof Avancados>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function statusDaUrl(st: string | null, legado: string | null): FiltrosDoQuadro["status"] {
  if (st !== null) return normalizarStatus(st.split(","));
  if (legado === "all") return [...STATUS_DO_NEGOCIO];
  if (legado === "open" || legado === "won" || legado === "lost") return [legado];
  return normalizarStatus([]);
}

function avancadosDaUrl(bruto: string | null): Avancados {
  if (!bruto) return {};
  try {
    const lido = avancadosSchema.safeParse(JSON.parse(bruto));
    return lido.success ? lido.data : {};
  } catch {
    return {};
  }
}

export function filtrosDaUrl(sp: Busca): { filtros: FiltrosDoQuadro; filtroSalvoId: string | null } {
  const base = filtersFromParams(sp);
  const salvo = sp.get(PARAM_FILTRO_SALVO);
  return {
    filtros: enxugar({
      ...avancadosDaUrl(sp.get(PARAM_AVANCADOS)),
      status: statusDaUrl(sp.get(PARAM_STATUS), sp.get("status")),
      busca: base.search,
      dono: base.owner,
      tags: marcadoresDoFiltro(base.tag),
      modoDasTags: base.tagMode === "ou" ? "ou" : undefined,
      atrasados: base.overdueOnly ? true : undefined,
      motivoDePerda: base.lostReason,
      categoriaDePerda: base.lostCategory,
    }),
    filtroSalvoId: salvo && UUID.test(salvo) ? salvo : null,
  };
}

export function filtrosParaUrl(filtros: FiltrosDoQuadro, filtroSalvoId: string | null = null): string {
  const f = enxugar(filtros);
  // `status: "all"` faz o original NÃO escrever `status=`: o status do fork vai em `st`.
  const base: LeadFilters = {
    status: "all",
    owner: f.dono,
    tag: f.tags,
    tagMode: f.modoDasTags,
    search: f.busca,
    overdueOnly: f.atrasados,
    lostReason: f.motivoDePerda,
    lostCategory: f.categoriaDePerda,
  };
  const p = new URLSearchParams(filtersToParams(base));
  if (!ehStatusPadrao(f.status)) p.set(PARAM_STATUS, f.status.join(","));
  const avancados = Object.fromEntries(CHAVES_AVANCADAS.flatMap((k) => (f[k] === undefined ? [] : [[k, f[k]]])));
  if (Object.keys(avancados).length > 0) p.set(PARAM_AVANCADOS, JSON.stringify(avancados));
  if (filtroSalvoId) p.set(PARAM_FILTRO_SALVO, filtroSalvoId);
  return p.toString();
}
