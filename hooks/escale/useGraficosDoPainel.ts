"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/types";
import type { GraficoDoPainel, LayoutDoGrafico } from "@/lib/escale/indicadores/graficos/tipos";

/**
 * OS GRÁFICOS DE UM PAINEL (fork Escale, Fase 7C): a leitura e as ações do painel aberto. O layout
 * grava no cache antes da resposta (arrastar não pode esperar a rede) e volta se o servidor recusar.
 */
const BASE = "/api/v1/indicadores-da-casca";
const FRESCOR_MS = 30_000;

export const chaveDosGraficos = (painelId: string) => ["graficos-do-painel", painelId] as const;

type ComId = { data: { id: string } };
type ItemDeLayout = { id: string } & LayoutDoGrafico;

export function useGraficosDoPainel(painelId: string) {
  return useQuery({
    queryKey: chaveDosGraficos(painelId),
    queryFn: async () =>
      (
        await apiClient.get<{ data: { graficos: GraficoDoPainel[] } }>(
          `${BASE}/paineis/${encodeURIComponent(painelId)}/graficos`,
        )
      ).data.graficos,
    staleTime: FRESCOR_MS,
  });
}

export function useAcoesDosGraficos(painelId: string) {
  const qc = useQueryClient();
  const chave = chaveDosGraficos(painelId);

  const salvarLayout = useMutation<{ salvos: number }, ApiError, ItemDeLayout[], { antes?: GraficoDoPainel[] }>({
    mutationFn: async (itens) =>
      (
        await apiClient.patch<{ data: { salvos: number } }>(
          `${BASE}/paineis/${encodeURIComponent(painelId)}/layout`,
          { itens },
        )
      ).data,
    onMutate: async (itens) => {
      await qc.cancelQueries({ queryKey: chave });
      const antes = qc.getQueryData<GraficoDoPainel[]>(chave);
      const novos = new Map(itens.map((i) => [i.id, { x: i.x, y: i.y, w: i.w, h: i.h }]));
      if (antes) {
        qc.setQueryData<GraficoDoPainel[]>(
          chave,
          antes.map((g) => (novos.has(g.id) ? { ...g, layout: novos.get(g.id) as LayoutDoGrafico } : g)),
        );
      }
      return { antes };
    },
    onError: (erro, _itens, contexto) => {
      if (contexto?.antes) qc.setQueryData(chave, contexto.antes);
      showApiError(erro);
    },
  });

  const duplicar = useMutation<{ id: string }, ApiError, string>({
    mutationFn: async (id) => (await apiClient.post<ComId>(`${BASE}/graficos/${encodeURIComponent(id)}/duplicar`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: chave }),
  });

  const excluir = useMutation<{ id: string }, ApiError, string>({
    mutationFn: async (id) => (await apiClient.delete<ComId>(`${BASE}/graficos/${encodeURIComponent(id)}`)).data,
    onSuccess: (_resposta, id) =>
      qc.setQueryData<GraficoDoPainel[]>(chave, (atual) => (atual ?? []).filter((g) => g.id !== id)),
  });

  return { salvarLayout, duplicar, excluir };
}
