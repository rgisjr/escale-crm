"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { SITUACOES_QUE_PULSAM } from "@/lib/escale/prospeccao/apresentacao";
import { consultaDaLista } from "@/lib/escale/prospeccao/filtros";
import type {
  DetalheDaProspeccao,
  FiltrosDaProspeccao,
  OpcoesDaProspeccao,
  PaginaDeProspeccoes,
} from "@/lib/escale/prospeccao/tipos";
import type { CampaignConfig, SearchInput } from "@/lib/prospecting/schema";

/**
 * OS DADOS DA PROSPECÇÃO NA CASCA (fork Escale, Fase 8D). Lê pelas rotas do
 * fork; escreve só pelo `POST /api/v1/prospecting` do original. Sem tempo real
 * (as tabelas não estão na publicação): reconsulta enquanto algo anda.
 */
export const CHAVE_DA_PROSPECCAO = "prospeccao-da-casca";
export const RECONSULTA_DA_PROSPECCAO_MS = 10_000;
export const RECONSULTA_DA_BUSCA_MS = 5_000;

export function reconsultaDaLista(p: PaginaDeProspeccoes | undefined): number | false {
  return p?.linhas.some((l) => SITUACOES_QUE_PULSAM.has(l.situacao))
    ? RECONSULTA_DA_PROSPECCAO_MS
    : false;
}

export function reconsultaDoDetalhe(d: DetalheDaProspeccao | undefined): number | false {
  if (d?.linha.situacao === "buscando") return RECONSULTA_DA_BUSCA_MS;
  return d?.linha.situacao === "em_progresso" ? RECONSULTA_DA_PROSPECCAO_MS : false;
}

export function useListaDeProspeccoes(
  filtros: FiltrosDaProspeccao,
  pagina: number,
  porPagina: number,
) {
  return useQuery({
    queryKey: [CHAVE_DA_PROSPECCAO, "lista", filtros, pagina, porPagina],
    queryFn: async () =>
      (
        await apiClient.get<{ data: PaginaDeProspeccoes }>(
          `/api/v1/prospeccao-da-casca?${consultaDaLista(filtros, pagina, porPagina)}`,
        )
      ).data,
    placeholderData: keepPreviousData,
    refetchInterval: (q) => reconsultaDaLista(q.state.data),
  });
}

export function useDetalheDaProspeccao(id: string | null) {
  return useQuery({
    queryKey: [CHAVE_DA_PROSPECCAO, "detalhe", id],
    enabled: id !== null,
    queryFn: async () =>
      (await apiClient.get<{ data: DetalheDaProspeccao }>(`/api/v1/prospeccao-da-casca/${id}`))
        .data,
    refetchInterval: (q) => reconsultaDoDetalhe(q.state.data),
  });
}

export function useOpcoesDaProspeccao() {
  return useQuery({
    queryKey: [CHAVE_DA_PROSPECCAO, "opcoes"],
    queryFn: async () =>
      (await apiClient.get<{ data: OpcoesDaProspeccao }>("/api/v1/prospeccao-da-casca/opcoes"))
        .data,
    staleTime: 60_000,
  });
}

/** Os pedidos que a casca manda ao motor do original (`prospectingInputSchema`). */
export type PedidoDaProspeccao =
  | { action: "configure"; api_key: string }
  | { action: "search"; request_id: string; search: SearchInput }
  | { action: "start"; id: string; config: CampaignConfig }
  | { action: "pause"; id: string }
  | { action: "resume"; id: string }
  | { action: "adjust_pace"; id: string; daily_limit: number; interval_minutes: number }
  | { action: "select" | "select_in_queue"; id: string; candidate_ids: string[]; selected: boolean }
  | { action: "discard_unselected"; id: string };

/**
 * O que a ação desatualizou. Só o `configure` mexe nas opções; a busca nova cria uma prospecção
 * (qualquer detalhe pode ser a dela); as demais mexem na lista e no detalhe do próprio id.
 */
export function chavesDesatualizadas(pedido: PedidoDaProspeccao): readonly (readonly string[])[] {
  if (pedido.action === "configure") return [[CHAVE_DA_PROSPECCAO]];
  if (pedido.action === "search") {
    return [
      [CHAVE_DA_PROSPECCAO, "lista"],
      [CHAVE_DA_PROSPECCAO, "detalhe"],
    ];
  }
  return [
    [CHAVE_DA_PROSPECCAO, "lista"],
    [CHAVE_DA_PROSPECCAO, "detalhe", pedido.id],
  ];
}

export function useAcaoDaProspeccao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido: PedidoDaProspeccao) =>
      (await apiClient.post<{ data: unknown }>("/api/v1/prospecting", pedido)).data,
    onSettled: (_dados, _erro, pedido) =>
      Promise.all(
        chavesDesatualizadas(pedido).map((queryKey) =>
          qc.invalidateQueries({ queryKey: [...queryKey] }),
        ),
      ),
  });
}
