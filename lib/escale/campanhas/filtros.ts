import { z } from "zod";

import type { StatusDaCampanha } from "@/lib/campanhas/tipos";

/**
 * OS FILTROS DA LISTA DE CAMPANHAS (fork Escale, Fase 8A; N4; 002, 004–006).
 * A tela guarda `FiltrosDeCampanhas`; a rota recebe o JSON enxuto em `?f=` e
 * compila para o banco (`fn_escale_campanha_passa`, 9301). Só o servidor põe o
 * fuso e o padrão do `ilike`.
 */

/** Os status do filtro, na ordem alfabética do rótulo (004). Sem "Processando": a Clint tira PREPARING. */
export const STATUS_DO_FILTRO = [
  "scheduled",
  "cancelled",
  "completed",
  "running",
  "failed",
  "paused",
  "ready",
  "draft",
] as const satisfies readonly StatusDaCampanha[];
export type StatusDoFiltro = (typeof STATUS_DO_FILTRO)[number];

/** As palavras do filtro da Clint (004), que não são as do selo. */
export const ROTULO_DO_FILTRO_DE_STATUS: Record<StatusDoFiltro, string> = {
  scheduled: "Agendado",
  cancelled: "Cancelado",
  completed: "Concluído",
  running: "Envio em Andamento",
  failed: "Erro de Processamento",
  paused: "Pausada",
  ready: "Pronta para enviar",
  draft: "Rascunho",
};

/** A busca espera a pessoa parar de digitar (a Clint: 500 ms). */
export const ESPERA_DA_BUSCA_MS = 500;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const periodoSchema = z
  .object({ de: z.string().regex(ISO).optional(), ate: z.string().regex(ISO).optional() })
  .strict();
export type PeriodoDoFiltro = z.infer<typeof periodoSchema>;

export const filtrosDeCampanhasSchema = z
  .object({
    busca: z.string().max(120).optional(),
    disparo: periodoSchema.optional(),
    criacao: periodoSchema.optional(),
    status: z.array(z.enum(STATUS_DO_FILTRO)).max(STATUS_DO_FILTRO.length).optional(),
    numero: z.string().uuid().optional(),
  })
  .strict();
export type FiltrosDeCampanhas = z.infer<typeof filtrosDeCampanhasSchema>;

export const FILTROS_VAZIOS: FiltrosDeCampanhas = {};

function periodoUtil(p: PeriodoDoFiltro | undefined): PeriodoDoFiltro | undefined {
  if (!p || (!p.de && !p.ate)) return undefined;
  return { ...(p.de ? { de: p.de } : {}), ...(p.ate ? { ate: p.ate } : {}) };
}

/** Sem chave vazia: o mesmo filtro tem sempre o mesmo texto (cache e URL). */
export function enxugarFiltros(f: FiltrosDeCampanhas): FiltrosDeCampanhas {
  const busca = f.busca?.trim();
  const disparo = periodoUtil(f.disparo);
  const criacao = periodoUtil(f.criacao);
  return {
    ...(busca ? { busca } : {}),
    ...(disparo ? { disparo } : {}),
    ...(criacao ? { criacao } : {}),
    ...(f.status?.length ? { status: [...new Set(f.status)] } : {}),
    ...(f.numero ? { numero: f.numero } : {}),
  };
}

export const temFiltro = (f: FiltrosDeCampanhas): boolean =>
  Object.keys(enxugarFiltros(f)).length > 0;

export const PARAM_DOS_FILTROS = "f";

export const textoDosFiltros = (f: FiltrosDeCampanhas): string => JSON.stringify(enxugarFiltros(f));

/** O `?f=` da rota → filtros; `null` quando veio e não vale (a rota responde 422). */
export function filtrosDoTexto(texto: string | null | undefined): FiltrosDeCampanhas | null {
  if (!texto) return {};
  try {
    const lido = filtrosDeCampanhasSchema.safeParse(JSON.parse(texto));
    return lido.success ? enxugarFiltros(lido.data) : null;
  } catch {
    return null;
  }
}

/** O que `fn_escale_campanha_passa` (9301) lê. */
export type FiltroCompilado = {
  fuso: string;
  padrao?: string;
  status?: StatusDoFiltro[];
  numero?: string;
  disparo_de?: string;
  disparo_ate?: string;
  criada_de?: string;
  criada_ate?: string;
};

/** "%termo%" com `%`, `_` e `\` escapados (o `ilike` usa `\` como escape). */
export const padraoDoNome = (busca: string): string =>
  `%${busca.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

export function compilarFiltros(f: FiltrosDeCampanhas, fuso: string): FiltroCompilado {
  const e = enxugarFiltros(f);
  return {
    fuso,
    ...(e.busca ? { padrao: padraoDoNome(e.busca) } : {}),
    ...(e.status ? { status: e.status } : {}),
    ...(e.numero ? { numero: e.numero } : {}),
    ...(e.disparo?.de ? { disparo_de: e.disparo.de } : {}),
    ...(e.disparo?.ate ? { disparo_ate: e.disparo.ate } : {}),
    ...(e.criacao?.de ? { criada_de: e.criacao.de } : {}),
    ...(e.criacao?.ate ? { criada_ate: e.criacao.ate } : {}),
  };
}
