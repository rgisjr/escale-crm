import type { SupabaseClient } from "@supabase/supabase-js";

import type { StatusDaCampanha } from "@/lib/campanhas/tipos";

import type { FiltroCompilado } from "./filtros";
import type { LinhaDeCampanha, PaginaDeCampanhas, ResumoDasCampanhas } from "./tipos";

/**
 * A LEITURA DA LISTA DE CAMPANHAS (fork Escale, Fase 8A) — servidor. As funções
 * da 9301 (invoker) filtram, paginam e contam com a sessão de quem olha; aqui
 * só se dá nome às colunas. `bigint` chega como texto pelo PostgREST.
 */
type Numero = number | string | null | undefined;

type LinhaDaFuncao = {
  campaign_id: string;
  total: Numero;
  nome: string;
  status: string;
  numero: string;
  solicitados: Numero;
  agendada_para: string | null;
  iniciada_em: string | null;
  criada_em: string;
  adicionados: Numero;
  enviados: Numero;
  entregues: Numero;
  lidos: Numero;
  erros: Numero;
};

type ResumoDaFuncao = Record<keyof ResumoDasCampanhas, Numero>;

const numero = (v: Numero): number => Number(v ?? 0);

export function linhaDaFuncao(l: LinhaDaFuncao): LinhaDeCampanha {
  return {
    id: l.campaign_id,
    nome: l.nome,
    status: l.status as StatusDaCampanha,
    numeroId: l.numero,
    solicitados: numero(l.solicitados),
    agendadaPara: l.agendada_para,
    iniciadaEm: l.iniciada_em,
    criadaEm: l.criada_em,
    adicionados: numero(l.adicionados),
    enviados: numero(l.enviados),
    entregues: numero(l.entregues),
    lidos: numero(l.lidos),
    erros: numero(l.erros),
  };
}

export async function lerPaginaDeCampanhas(
  supabase: SupabaseClient,
  orgId: string,
  filtro: FiltroCompilado,
  pagina: number,
  porPagina: number,
): Promise<PaginaDeCampanhas> {
  const { data, error } = await supabase.rpc("fn_escale_lista_de_campanhas", {
    p_org: orgId,
    p_filtros: filtro,
    p_limite: porPagina,
    p_deslocamento: (pagina - 1) * porPagina,
  });
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as LinhaDaFuncao[];
  return { linhas: linhas.map(linhaDaFuncao), total: numero(linhas[0]?.total), pagina, porPagina };
}

export async function lerResumoDasCampanhas(
  supabase: SupabaseClient,
  orgId: string,
  filtro: FiltroCompilado,
): Promise<ResumoDasCampanhas> {
  const { data, error } = await supabase.rpc("fn_escale_resumo_das_campanhas", {
    p_org: orgId,
    p_filtros: filtro,
  });
  if (error) throw new Error(error.message);
  const r = (Array.isArray(data) ? data[0] : data) as ResumoDaFuncao | undefined;
  return {
    adicionados: numero(r?.adicionados),
    enviados: numero(r?.enviados),
    entregues: numero(r?.entregues),
    lidos: numero(r?.lidos),
    erros: numero(r?.erros),
  };
}
