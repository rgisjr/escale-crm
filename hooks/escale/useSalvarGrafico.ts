"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/types";
import type { EdicaoDoGrafico, NovoGrafico } from "@/lib/escale/indicadores/graficos/banco";

import { chaveDosGraficos } from "./useGraficosDoPainel";

const BASE = "/api/v1/indicadores-da-casca/graficos";

export type PedidoDeAtualizacao = { id: string; painelDeOrigem: string } & EdicaoDoGrafico;

/**
 * Criar e atualizar gráfico (fork Escale, Fase 7D). Depois de gravar, os gráficos do painel de destino
 * (e, ao mover, os do de origem) são relidos.
 */
export function useSalvarGrafico() {
  const qc = useQueryClient();
  const invalidar = (...paineis: Array<string | undefined>) =>
    Promise.all(
      [...new Set(paineis.filter((p): p is string => !!p))].map((p) =>
        qc.invalidateQueries({ queryKey: chaveDosGraficos(p) }),
      ),
    );

  const criar = useMutation<{ id: string }, ApiError, NovoGrafico>({
    mutationFn: async (novo) => (await apiClient.post<{ data: { id: string } }>(BASE, novo)).data,
    onSuccess: (_r, novo) => invalidar(novo.painelId),
  });
  const atualizar = useMutation<{ id: string }, ApiError, PedidoDeAtualizacao>({
    mutationFn: async ({ id, painelDeOrigem: _origem, ...edicao }) =>
      (await apiClient.patch<{ data: { id: string } }>(`${BASE}/${encodeURIComponent(id)}`, edicao)).data,
    onSuccess: (_r, pedido) => invalidar(pedido.painelDeOrigem, pedido.painelId),
  });
  return { criar, atualizar };
}
