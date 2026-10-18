"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { AcoesDaPessoa, PedidoDeAcao, StatusDaAcao } from "@/lib/escale/massa/tipos";

export const CHAVE_DAS_ACOES = ["acoes-em-massa"] as const;

/** Pedir uma ação em massa (fork Escale, Fase 2B). Responde com o id, o total resolvido e o status (Q4). */
export function usePedirAcaoEmMassa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido: PedidoDeAcao) =>
      (
        await apiClient.post<{ data: { id: string; total: number; status: StatusDaAcao } }>(
          "/api/v1/acoes-em-massa",
          pedido,
        )
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_DAS_ACOES }),
  });
}

/**
 * As minhas ações (últimos 8 dias) e, para o admin, os pedidos de exportação para
 * aprovar. Quem usa diz se pergunta e de quanto em quanto tempo; com dois usos ao
 * mesmo tempo (o aviso de fim e o botão "Exportações"), vale o menor intervalo.
 */
export function useAcoesEmMassa(ativo: boolean, intervalo: number | false = 3000) {
  return useQuery({
    queryKey: CHAVE_DAS_ACOES,
    queryFn: async () =>
      (await apiClient.get<{ data: AcoesDaPessoa }>("/api/v1/acoes-em-massa")).data,
    enabled: ativo,
    refetchInterval: ativo ? intervalo : false,
  });
}

/** O admin aprova ou recusa um pedido de exportação (Q4). */
export function useDecidirExportacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, aprovar }: { id: string; aprovar: boolean }) =>
      (
        await apiClient.post<{ data: { id: string; status: StatusDaAcao } }>(
          `/api/v1/acoes-em-massa/${id}/${aprovar ? "aprovar" : "recusar"}`,
          {},
        )
      ).data,
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE_DAS_ACOES }),
  });
}
