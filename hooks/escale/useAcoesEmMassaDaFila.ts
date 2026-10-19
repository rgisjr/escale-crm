"use client";
import { useMutation, useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import {
  acaoRodando,
  type EstadoDaAcaoDaFila,
  type PedidoDaFila,
  type ResumoDaAcaoDaFila,
} from "@/lib/escale/conversas/acoes-em-massa-da-fila";

const ROTA = "/api/v1/acoes-em-massa-conversas";
const INTERVALO_MS = 3000;

export function useExecutarAcaoDaFila() {
  return useMutation({
    mutationFn: async (pedido: PedidoDaFila) =>
      (
        await apiClient.post<{ data: { id: string; total: number; status: EstadoDaAcaoDaFila } }>(
          ROTA,
          pedido,
        )
      ).data,
  });
}

/** O andamento da ação em segundo plano (N15): pergunta a cada 3 s enquanto roda. */
export function useAcaoDaFila(id: string | null) {
  return useQuery({
    queryKey: ["acao-em-massa-da-fila", id],
    enabled: !!id,
    queryFn: async () => (await apiClient.get<{ data: ResumoDaAcaoDaFila }>(`${ROTA}/${id}`)).data,
    refetchInterval: (q) =>
      q.state.data && !acaoRodando(q.state.data.status) ? false : INTERVALO_MS,
  });
}
