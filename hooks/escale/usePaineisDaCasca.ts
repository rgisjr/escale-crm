"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { EdicaoDoPainel, PainelDaLista } from "@/lib/escale/indicadores/paineis/tipos";

/**
 * OS DADOS DA LISTA DE PAINÉIS (fork Escale, Fase 7B): a lista e as ações
 * (criar em branco, editar, duplicar, excluir) nas rotas do fork. Toda ação
 * invalida a lista: o resultado aparece nela (a Clint não mostra toast).
 */
export const CHAVE_DOS_PAINEIS = "paineis-da-casca";
const BASE = "/api/v1/indicadores-da-casca/paineis";
const FRESCOR_MS = 30_000;

type ComId = { data: { id: string } };

export function usePaineis() {
  return useQuery({
    queryKey: [CHAVE_DOS_PAINEIS],
    queryFn: async () => (await apiClient.get<{ data: { paineis: PainelDaLista[] } }>(BASE)).data.paineis,
    staleTime: FRESCOR_MS,
  });
}

export type PedidoDeEdicao = { id: string; edicao: Partial<EdicaoDoPainel> };

export function useAcoesDosPaineis() {
  const qc = useQueryClient();
  const aoTerminar = () => qc.invalidateQueries({ queryKey: [CHAVE_DOS_PAINEIS] });
  const caminho = (id: string) => `${BASE}/${encodeURIComponent(id)}`;

  const criar = useMutation({
    // O editor de gráfico (7D) cria o painel já com o nome digitado.
    mutationFn: async (a?: { nome?: string }) => (await apiClient.post<ComId>(BASE, a?.nome ? { nome: a.nome } : {})).data,
    onSuccess: aoTerminar,
  });
  const editar = useMutation({
    mutationFn: async ({ id, edicao }: PedidoDeEdicao) => (await apiClient.patch<ComId>(caminho(id), edicao)).data,
    onSuccess: aoTerminar,
  });
  const duplicar = useMutation({
    mutationFn: async (id: string) => (await apiClient.post<ComId>(`${caminho(id)}/duplicar`, {})).data,
    onSuccess: aoTerminar,
  });
  const excluir = useMutation({
    mutationFn: async (id: string) => (await apiClient.delete<ComId>(caminho(id))).data,
    onSuccess: aoTerminar,
  });
  return { criar, editar, duplicar, excluir };
}
