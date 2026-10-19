"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { apiClient } from "@/lib/api/client";
import type { SetorDaConversa } from "@/lib/escale/conversas/setores-banco";
import type { NovoSetor, SetorLido } from "@/lib/escale/conversas/setores";

export const CHAVE_DOS_SETORES = ["setores"] as const;
export const CHAVE_DOS_SETORES_DAS_CONVERSAS = ["setores-das-conversas"] as const;

/** Os setores da organização (fork Escale, Fase 3C; E1). */
export function useSetores(enabled = true) {
  return useQuery({
    queryKey: CHAVE_DOS_SETORES,
    enabled,
    queryFn: async () => apiClient.get<{ data: SetorLido[] }>("/api/v1/setores"),
    select: (r) => r.data,
    staleTime: 30_000,
  });
}

function useInvalidarSetores() {
  const qc = useQueryClient();
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: CHAVE_DOS_SETORES }),
      qc.invalidateQueries({ queryKey: CHAVE_DOS_SETORES_DAS_CONVERSAS }),
    ]);
  };
}

export function useSalvarSetor() {
  const invalidar = useInvalidarSetores();
  return useMutation({
    mutationFn: async ({ id, ...setor }: { id?: string } & NovoSetor) =>
      id
        ? apiClient.patch<{ data: { id: string } }>(`/api/v1/setores/${id}`, setor)
        : apiClient.post<{ data: { id: string } }>("/api/v1/setores", setor),
    onSuccess: invalidar,
    onError: showApiError,
  });
}

export function useRemoverSetor() {
  const invalidar = useInvalidarSetores();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/api/v1/setores/${id}`),
    onSuccess: invalidar,
    onError: showApiError,
  });
}

export function useSetorDoDispositivo() {
  const qc = useQueryClient();
  const invalidar = useInvalidarSetores();
  return useMutation({
    mutationFn: async (args: { channel_session_id: string; setor_id: string | null }) =>
      apiClient.put("/api/v1/setores/do-dispositivo", args),
    onSuccess: async () => {
      await Promise.all([invalidar(), qc.invalidateQueries({ queryKey: ["channel-sessions"] })]);
    },
    onError: showApiError,
  });
}

/** O chip da linha e o selo do cabeçalho (N16): uma chamada por página de ids. */
export function useSetoresDasConversas(
  conversationIds: readonly string[],
): Record<string, SetorDaConversa> {
  const ids = [...new Set(conversationIds)].sort();
  const q = useQuery({
    queryKey: [...CHAVE_DOS_SETORES_DAS_CONVERSAS, ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () =>
      apiClient.get<{ data: Record<string, SetorDaConversa> }>(
        `/api/v1/setores/das-conversas?ids=${encodeURIComponent(ids.join(","))}`,
      ),
    select: (r) => r.data,
    staleTime: 30_000,
  });
  return q.data ?? {};
}

function useInvalidarConversa(conversationId: string) {
  const qc = useQueryClient();
  const invalidar = useInvalidarSetores();
  return async () => {
    await Promise.all([
      invalidar(),
      qc.invalidateQueries({ queryKey: ["conversations"] }),
      qc.invalidateQueries({ queryKey: ["conversation", conversationId] }),
      qc.invalidateQueries({ queryKey: ["eventos-da-conversa", conversationId] }),
    ]);
  };
}

/** "Alterar setor" e "Cancelar transferência" (C3, N7). */
export function useAlterarSetor(conversationId: string) {
  const invalidar = useInvalidarConversa(conversationId);
  const base = `/api/v1/conversas-da-casca/${conversationId}/setor`;
  const alterar = useMutation({
    mutationFn: async (setorId: string) => apiClient.post(base, { setor_id: setorId }),
    onSuccess: invalidar,
    onError: showApiError,
  });
  const cancelar = useMutation({
    mutationFn: async () => apiClient.delete(base),
    onSuccess: invalidar,
    onError: showApiError,
  });
  return { alterar, cancelar };
}

/** "Sem atendente" no atendimento de outra pessoa (N8). */
export function useLiberarDeOutro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) =>
      apiClient.post(`/api/v1/conversas-da-casca/${conversationId}/liberar`, {}),
    onSuccess: async (_d, conversationId) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["conversations"] }),
        qc.invalidateQueries({ queryKey: ["conversation", conversationId] }),
      ]);
    },
  });
}
