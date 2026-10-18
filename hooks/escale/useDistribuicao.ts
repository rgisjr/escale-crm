"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import type { DistribuicaoFeita } from "@/lib/escale/distribuicao/ler";
import type {
  AlteracaoDaDistribuicao,
  PedidoDaDistribuicao,
} from "@/lib/escale/distribuicao/regras";

import { chaveDasConfiguracoes } from "./useConfiguracoesDaOrigem";

type Resposta = { data: ConfiguracoesDaOrigem };
const base = (id: string) => `/api/v1/pipelines/${id}/distribuicao`;

export const chaveDasAlteracoes = (id: string) => ["distribuicao-alteracoes", id] as const;
export const chaveDasFeitas = (id: string) => ["distribuicao-feitas", id] as const;

/** Fase 1K (D13): salvar a distribuição. A resposta é a origem relida e vai para o cache da janela. */
export function useSalvarDistribuicao(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido: PedidoDaDistribuicao) =>
      (await apiClient.put<Resposta>(base(id), pedido)).data,
    onSuccess: (config) => {
      qc.setQueryData(chaveDasConfiguracoes(id), config);
      void qc.invalidateQueries({ queryKey: chaveDasAlteracoes(id) });
      void qc.invalidateQueries({ queryKey: chaveDasFeitas(id) });
    },
  });
}

/** "Resetar distribuição": imediato, sem passar pelo Salvar da janela (Clint). */
export function useReiniciarDistribuicao(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.post<Resposta>(`${base(id)}/reiniciar`, {})).data,
    onSuccess: (config) => {
      qc.setQueryData(chaveDasConfiguracoes(id), config);
      void qc.invalidateQueries({ queryKey: chaveDasAlteracoes(id) });
      void qc.invalidateQueries({ queryKey: chaveDasFeitas(id) });
    },
  });
}

/** O histórico da configuração (a gaveta do relógio): só lê com a gaveta aberta. */
export function useAlteracoesDaDistribuicao(id: string, aberta: boolean) {
  return useQuery({
    queryKey: chaveDasAlteracoes(id),
    enabled: aberta,
    staleTime: 0,
    queryFn: async () =>
      (await apiClient.get<{ data: AlteracaoDaDistribuicao[] }>(`${base(id)}/alteracoes`)).data,
  });
}

export interface FiltrosDasDistribuicoes {
  usuario: string;
  busca: string;
  periodo: "" | "7" | "30";
  pagina: number;
}

/** As distribuições feitas (a janela do contador): só lê com a janela aberta; mantém a página anterior enquanto busca. */
export function useDistribuicoesFeitas(
  id: string,
  filtros: FiltrosDasDistribuicoes,
  aberta: boolean,
) {
  return useQuery({
    queryKey: [...chaveDasFeitas(id), filtros] as const,
    enabled: aberta,
    staleTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const busca = new URLSearchParams({
        usuario: filtros.usuario,
        busca: filtros.busca,
        periodo: filtros.periodo,
        pagina: String(filtros.pagina),
      });
      return (
        await apiClient.get<{ data: { itens: DistribuicaoFeita[]; total: number } }>(
          `${base(id)}/feitas?${busca.toString()}`,
        )
      ).data;
    },
  });
}
