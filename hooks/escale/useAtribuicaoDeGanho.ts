"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { GanhoDoNegocio } from "@/app/api/v1/leads/[id]/atribuicao-de-ganho/route";
import { apiClient } from "@/lib/api/client";

const rota = (leadId: string) => `/api/v1/leads/${leadId}/atribuicao-de-ganho`;
export const chaveDoGanho = (leadId: string) => ["atribuicao-de-ganho", leadId] as const;

/** Fase 1K (D14): o crédito do negócio ganho; só lê com a janela aberta. */
export function useAtribuicaoDeGanho(leadId: string, aberta: boolean) {
  return useQuery({
    queryKey: chaveDoGanho(leadId),
    enabled: aberta,
    staleTime: 0,
    queryFn: async () => (await apiClient.get<{ data: GanhoDoNegocio | null }>(rota(leadId))).data,
  });
}

export function useCorrigirGanho(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (corpo: { creditado_a: string | null; ganho_em: string }) =>
      (await apiClient.patch<{ data: GanhoDoNegocio | null }>(rota(leadId), corpo)).data,
    onSuccess: (ganho) => qc.setQueryData(chaveDoGanho(leadId), ganho),
  });
}
