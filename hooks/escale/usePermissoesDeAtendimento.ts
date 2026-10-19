"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { apiClient } from "@/lib/api/client";
import type { ChaveDePermissao, Excecoes } from "@/lib/escale/conversas/permissoes";

/** As chaves editáveis da pessoa da sessão (fn_crm_pode). Vazio enquanto carrega = tudo desligado na tela. */
export function useMinhasPermissoes(): Partial<Record<ChaveDePermissao, boolean>> {
  const q = useQuery({
    queryKey: ["permissoes-de-atendimento", "minhas"],
    queryFn: async () =>
      apiClient.get<{ data: Partial<Record<ChaveDePermissao, boolean>> }>(
        "/api/v1/permissoes-de-atendimento/minhas",
      ),
    select: (r) => r.data,
    staleTime: 60_000,
  });
  return q.data ?? {};
}

export function usePermissoesDoUsuario(userId: string | null) {
  return useQuery({
    queryKey: ["permissoes-de-atendimento", userId],
    enabled: !!userId,
    queryFn: async () =>
      apiClient.get<{ data: { excecoes: Excecoes } }>(
        `/api/v1/permissoes-de-atendimento?user_id=${userId}`,
      ),
    select: (r) => r.data,
  });
}

export function useGravarPermissoes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      user_id: string;
      valores: Partial<Record<ChaveDePermissao, boolean | null>>;
    }) =>
      apiClient.put<{ data: { excecoes: Excecoes } }>("/api/v1/permissoes-de-atendimento", args),
    onSuccess: async (_d, args) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["permissoes-de-atendimento", args.user_id] }),
        qc.invalidateQueries({ queryKey: ["usuarios-da-casca"] }),
      ]);
    },
    onError: showApiError,
  });
}

export function useResetarPermissoes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) =>
      apiClient.delete(`/api/v1/permissoes-de-atendimento?user_id=${userId}`),
    onSuccess: async (_d, userId) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["permissoes-de-atendimento", userId] }),
        qc.invalidateQueries({ queryKey: ["usuarios-da-casca"] }),
      ]);
    },
    onError: showApiError,
  });
}
