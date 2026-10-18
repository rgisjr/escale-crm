"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { rotaDasNotas, type Nota } from "@/lib/escale/negocio/notas";

/** NOTAS DO NEGÓCIO (fork Escale, Fase 1H; C15): ler, criar, editar e apagar. */
export const chaveDasNotas = (leadId: string) => ["notas-do-negocio", leadId] as const;

export function useNotasDoNegocio(leadId: string) {
  return useQuery({
    queryKey: chaveDasNotas(leadId),
    queryFn: async () => (await apiClient.get<{ data: Nota[] }>(rotaDasNotas(leadId))).data,
  });
}

function useInvalidarNotas(leadId: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: chaveDasNotas(leadId) }),
      qc.invalidateQueries({ queryKey: ["timeline", leadId] }),
    ]);
}

export function useCriarNota(leadId: string) {
  const invalidar = useInvalidarNotas(leadId);
  return useMutation({
    mutationFn: async (texto: string) =>
      (await apiClient.post<{ data: Nota }>(rotaDasNotas(leadId), { texto })).data,
    onSuccess: () => void invalidar(),
  });
}

export function useEditarNota(leadId: string) {
  const invalidar = useInvalidarNotas(leadId);
  return useMutation({
    mutationFn: async ({ notaId, texto }: { notaId: string; texto: string }) =>
      (await apiClient.patch<{ data: Nota }>(`${rotaDasNotas(leadId)}/${notaId}`, { texto })).data,
    onSuccess: () => void invalidar(),
  });
}

export function useExcluirNota(leadId: string) {
  const invalidar = useInvalidarNotas(leadId);
  return useMutation({
    mutationFn: async (notaId: string) =>
      apiClient.delete<void>(`${rotaDasNotas(leadId)}/${notaId}`),
    onSuccess: () => void invalidar(),
  });
}
