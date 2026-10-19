"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { CriacaoDeNegocio } from "@/lib/escale/conversas/criacao-de-negocio";

export type OrigemDaCriacao = {
  id: string;
  nome: string;
  etapas: Array<{ id: string; nome: string }>;
};
const chave = (canalId: string) => ["criacao-de-negocio", canalId] as const;

export function useCriacaoDeNegocio(canalId: string | null) {
  return useQuery({
    queryKey: chave(canalId ?? ""),
    enabled: !!canalId,
    queryFn: async () =>
      (
        await apiClient.get<{ data: { configurado: boolean; criacao: CriacaoDeNegocio } }>(
          `/api/v1/criacao-de-negocio/${canalId}`,
        )
      ).data,
  });
}

export function useSalvarCriacaoDeNegocio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ canalId, criacao }: { canalId: string; criacao: CriacaoDeNegocio }) =>
      (
        await apiClient.put<{ data: { criacao: CriacaoDeNegocio } }>(
          `/api/v1/criacao-de-negocio/${canalId}`,
          criacao,
        )
      ).data,
    onSuccess: (_r, v) => void qc.invalidateQueries({ queryKey: chave(v.canalId) }),
  });
}

export function useOrigensDaCriacao(ativo: boolean) {
  return useQuery({
    queryKey: ["criacao-de-negocio", "origens"],
    enabled: ativo,
    staleTime: 5 * 60_000,
    queryFn: async () =>
      (await apiClient.get<{ data: OrigemDaCriacao[] }>("/api/v1/criacao-de-negocio/origens")).data,
  });
}
