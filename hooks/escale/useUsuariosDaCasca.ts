"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { apiClient } from "@/lib/api/client";

export type ExtrasDoUsuario = { setores: string[]; excecoes: number };

/** Setores e exceções de cada pessoa (a lista de c40 e a aba Geral). Só admin. */
export function useUsuariosDaCasca(enabled = true): Record<string, ExtrasDoUsuario> {
  const q = useQuery({
    queryKey: ["usuarios-da-casca"],
    enabled,
    queryFn: async () =>
      apiClient.get<{ data: Record<string, ExtrasDoUsuario> }>("/api/v1/usuarios-da-casca"),
    select: (r) => r.data,
    staleTime: 30_000,
  });
  return q.data ?? {};
}

export function useGravarSetoresDoUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { userId: string; setorIds: string[] }) =>
      apiClient.put(`/api/v1/usuarios-da-casca/${args.userId}/setores`, {
        setor_ids: args.setorIds,
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["usuarios-da-casca"] }),
        qc.invalidateQueries({ queryKey: ["setores"] }),
      ]);
    },
    onError: showApiError,
  });
}
