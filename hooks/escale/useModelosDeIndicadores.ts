"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CHAVE_DOS_PAINEIS } from "@/hooks/escale/usePaineisDaCasca";
import { apiClient } from "@/lib/api/client";
import type { FiltrosDoModelo } from "@/lib/escale/indicadores/modelos/regras";
import type { ModeloNaLista } from "@/lib/escale/indicadores/modelos/tipos";

/**
 * OS MODELOS DE PAINEL (fork Escale, Fase 7F): a lista do modal "Novo dashboard" e as ações
 * (usar modelo, tornar template, excluir template) nas rotas do fork.
 */
export const CHAVE_DOS_MODELOS = "modelos-de-indicadores";
const BASE = "/api/v1/indicadores-da-casca";
const FRESCOR_MS = 30_000;

type ComId = { data: { id: string } };
export type PedidoDeUso = { modelo: { origem: "sistema" | "organizacao"; id: string }; filtros: FiltrosDoModelo };

/** `ligado` = modal aberto: a lista só é buscada quando alguém vai vê-la. */
export function useModelos(ligado: boolean) {
  return useQuery({
    queryKey: [CHAVE_DOS_MODELOS],
    queryFn: async () => (await apiClient.get<{ data: { modelos: ModeloNaLista[] } }>(`${BASE}/modelos`)).data.modelos,
    enabled: ligado,
    staleTime: FRESCOR_MS,
  });
}

export function useAcoesDosModelos() {
  const qc = useQueryClient();
  const invalidar = (chave: string) => () => qc.invalidateQueries({ queryKey: [chave] });
  const usar = useMutation({
    mutationFn: async (pedido: PedidoDeUso) => (await apiClient.post<ComId>(`${BASE}/modelos/usar`, pedido)).data,
    onSuccess: invalidar(CHAVE_DOS_PAINEIS),
  });
  const tornarTemplate = useMutation({
    mutationFn: async (painelId: string) =>
      (await apiClient.post<ComId>(`${BASE}/paineis/${encodeURIComponent(painelId)}/tornar-template`, {})).data,
    onSuccess: invalidar(CHAVE_DOS_MODELOS),
  });
  const excluirTemplate = useMutation({
    mutationFn: async (id: string) => (await apiClient.delete<ComId>(`${BASE}/modelos/${encodeURIComponent(id)}`)).data,
    onSuccess: invalidar(CHAVE_DOS_MODELOS),
  });
  return { usar, tornarTemplate, excluirTemplate };
}
