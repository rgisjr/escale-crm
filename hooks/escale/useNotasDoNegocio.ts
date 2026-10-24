"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { rotaDasNotasDoAlvo, type AlvoDaNota, type Nota } from "@/lib/escale/negocio/notas";

/**
 * NOTAS DO NEGÓCIO E DO CONTATO (fork Escale, Fases 1H e 2E; C15, Q5): ler,
 * criar, editar e apagar pelo alvo. O histórico do alvo é invalidado junto.
 */
export const chaveDasNotas = (alvo: AlvoDaNota) => ["notas", alvo.tipo, alvo.id] as const;

export function useNotas(alvo: AlvoDaNota) {
  return useQuery({
    queryKey: chaveDasNotas(alvo),
    queryFn: async () => (await apiClient.get<{ data: Nota[] }>(rotaDasNotasDoAlvo(alvo))).data,
  });
}

/** Atalho da ficha do negócio (1H). */
export const useNotasDoNegocio = (leadId: string) => useNotas({ tipo: "negocio", id: leadId });

function useInvalidarNotas(alvo: AlvoDaNota) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["notas"] }),
      qc.invalidateQueries({ queryKey: ["timeline", alvo.id] }),
    ]);
}

export function useCriarNota(alvo: AlvoDaNota) {
  const invalidar = useInvalidarNotas(alvo);
  return useMutation({
    mutationFn: async (texto: string) =>
      (await apiClient.post<{ data: Nota }>(rotaDasNotasDoAlvo(alvo), { texto })).data,
    onSuccess: () => void invalidar(),
  });
}

export function useEditarNota(alvo: AlvoDaNota) {
  const invalidar = useInvalidarNotas(alvo);
  return useMutation({
    mutationFn: async ({ notaId, texto }: { notaId: string; texto: string }) =>
      (await apiClient.patch<{ data: Nota }>(`${rotaDasNotasDoAlvo(alvo)}/${notaId}`, { texto })).data,
    onSuccess: () => void invalidar(),
  });
}

export function useExcluirNota(alvo: AlvoDaNota) {
  const invalidar = useInvalidarNotas(alvo);
  return useMutation({
    mutationFn: async (notaId: string) => apiClient.delete<void>(`${rotaDasNotasDoAlvo(alvo)}/${notaId}`),
    onSuccess: () => void invalidar(),
  });
}
