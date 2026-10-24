"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CHAVE_DAS_CAMPANHAS, RECONSULTA_MS } from "@/hooks/escale/useCampanhasDaCasca";
import { apiClient } from "@/lib/api/client";
import type { StatusDaCampanha } from "@/lib/campanhas/tipos";
import { nomeDoCsvDaCampanha } from "@/lib/escale/campanhas/detalhe/csv";
import {
  textoDosFiltrosDeDestinatarios,
  type FiltrosDeDestinatarios,
} from "@/lib/escale/campanhas/detalhe/filtros";
import type { PedidoDaCampanha, RespostaDaMassa } from "@/lib/escale/campanhas/detalhe/massa";
import type { CorpoDoRitmo } from "@/lib/escale/campanhas/detalhe/ritmo";
import type {
  DadosDoDetalhe,
  NegociosDaCampanha,
  PaginaDeDestinatarios,
  SituacaoDosNegocios,
} from "@/lib/escale/campanhas/detalhe/tipos";
import { baixarCsv } from "@/lib/escale/exportar/baixar";

/**
 * OS DADOS DO DETALHE DA CAMPANHA (fork Escale, Fase 8C). A chave mora debaixo
 * de `CHAVE_DAS_CAMPANHAS`: o tempo real e as ações da 8A já invalidam o
 * detalhe (N15). Pausar e retomar seguem pelo `useAcoesDaCampanha` da 8A.
 */
const ANDANDO: ReadonlySet<StatusDaCampanha> = new Set(["preparing", "running"]);
const rota = (id: string) => `/api/v1/campanhas-da-casca/${id}`;

export const chaveDoDetalhe = (id: string) => [CHAVE_DAS_CAMPANHAS, "detalhe", id] as const;

export const reconsultaDoDetalhe = (d: DadosDoDetalhe | undefined): number | false =>
  d && ANDANDO.has(d.campanha.status) ? RECONSULTA_MS : false;

export function useDetalheDaCampanha(id: string) {
  return useQuery({
    queryKey: chaveDoDetalhe(id),
    queryFn: async () =>
      (await apiClient.get<{ data: DadosDoDetalhe }>(`${rota(id)}/sumario`)).data,
    refetchInterval: (q) => reconsultaDoDetalhe(q.state.data),
  });
}

export function useDestinatariosDaCampanha(
  id: string,
  filtros: FiltrosDeDestinatarios,
  pagina: number,
  porPagina: number,
  ativo: boolean,
  andando: boolean,
) {
  const texto = textoDosFiltrosDeDestinatarios(filtros);
  return useQuery({
    queryKey: [...chaveDoDetalhe(id), "destinatarios", texto, pagina, porPagina],
    enabled: ativo,
    placeholderData: keepPreviousData,
    refetchInterval: andando ? RECONSULTA_MS : false,
    queryFn: async () => {
      const qs = new URLSearchParams({ p: String(pagina), n: String(porPagina) });
      if (texto !== "{}") qs.set("f", texto);
      return (
        await apiClient.get<{ data: PaginaDeDestinatarios }>(
          `${rota(id)}/destinatarios?${qs.toString()}`,
        )
      ).data;
    },
  });
}

export function useNegociosDaCampanha(id: string, situacao: SituacaoDosNegocios, aberto: boolean) {
  return useQuery({
    queryKey: [...chaveDoDetalhe(id), "negocios", situacao],
    enabled: aberto,
    queryFn: async () =>
      (
        await apiClient.get<{ data: NegociosDaCampanha }>(
          `${rota(id)}/negocios?situacao=${situacao}`,
        )
      ).data,
  });
}

export function useMassaDaCampanha(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido: PedidoDaCampanha) =>
      (await apiClient.post<{ data: RespostaDaMassa }>(`${rota(id)}/massa`, pedido)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CHAVE_DAS_CAMPANHAS] });
    },
  });
}

export function useRitmoDaCampanha(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (corpo: CorpoDoRitmo) => apiClient.patch(`/api/v1/campaigns/${id}`, corpo),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CHAVE_DAS_CAMPANHAS] });
    },
  });
}

/** "Baixar .CSV": a rota devolve o texto; o navegador põe o BOM e o nome (N14). */
export async function baixarCsvDaCampanha(id: string, nome: string, fuso?: string): Promise<void> {
  const resposta = await fetch(`${rota(id)}/csv`, { credentials: "same-origin" });
  if (!resposta.ok) throw new Error("Não foi possível baixar o arquivo. Tente novamente.");
  baixarCsv(nomeDoCsvDaCampanha(nome, new Date(), fuso), await resposta.text());
}
