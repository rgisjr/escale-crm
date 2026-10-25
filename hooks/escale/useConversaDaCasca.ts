"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { recarregarListasDasConversas } from "@/hooks/inbox/recargaDasConversas";
import { apiClient } from "@/lib/api/client";
import type { EventoDaConversa } from "@/lib/escale/conversas/eventos";

export interface EstadoDaPausa {
  pausa: { ate: string | null; user_id: string; created_at: string } | null;
  agenteAtivo: boolean;
  followups: { ativos: number; proximoEm: string | null };
}

export const CHAVE_DOS_EVENTOS = (id: string) => ["eventos-da-conversa", id] as const;
export const CHAVE_DA_PAUSA = (id: string) => ["pausa-da-conversa", id] as const;

/**
 * A CONVERSA ABERTA NA CASCA (fork Escale, Fase 3B): os eventos da thread, o
 * estado da pausa e as sete ações das rotas `conversas-da-casca/[id]/…`.
 * As ações do original que a casca reaproveita (claim, transfer, release,
 * send, mark-read) continuam nos hooks de `hooks/inbox`.
 */
export function useConversaDaCasca(conversationId: string | null) {
  const qc = useQueryClient();
  const base = `/api/v1/conversas-da-casca/${conversationId}`;
  const invalidarConversa = async () => {
    if (!conversationId) return;
    recarregarListasDasConversas(qc);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["conversation", conversationId] }),
      qc.invalidateQueries({ queryKey: CHAVE_DOS_EVENTOS(conversationId) }),
    ]);
  };
  const invalidarPausa = async () => {
    if (!conversationId) return;
    await qc.invalidateQueries({ queryKey: CHAVE_DA_PAUSA(conversationId) });
  };

  const eventos = useQuery({
    queryKey: CHAVE_DOS_EVENTOS(conversationId ?? "nenhuma"),
    enabled: !!conversationId,
    queryFn: async () => apiClient.get<{ data: EventoDaConversa[] }>(`${base}/eventos`),
    select: (r) => r.data,
    staleTime: 15_000,
  });
  const pausa = useQuery({
    queryKey: CHAVE_DA_PAUSA(conversationId ?? "nenhuma"),
    enabled: !!conversationId,
    queryFn: async () => apiClient.get<{ data: EstadoDaPausa }>(`${base}/pausa`),
    select: (r) => r.data,
    staleTime: 15_000,
  });

  const entrarEmEspera = useMutation({
    mutationFn: async () =>
      apiClient.post<{ data: { snooze_until: string } }>(`${base}/espera`, {}),
    onSuccess: invalidarConversa,
    onError: showApiError,
  });
  const sairDaEspera = useMutation({
    mutationFn: async () => apiClient.delete(`${base}/espera`),
    onSuccess: invalidarConversa,
    onError: showApiError,
  });
  const encerrar = useMutation({
    mutationFn: async (args: { expected_revision?: number }) =>
      apiClient.post(`${base}/encerrar`, args),
    onSuccess: invalidarConversa,
    onError: showApiError,
  });
  const reabrir = useMutation({
    mutationFn: async () => apiClient.post(`${base}/reabrir`, {}),
    onSuccess: invalidarConversa,
    onError: showApiError,
  });
  const marcarNaoLida = useMutation({
    mutationFn: async () => apiClient.post(`${base}/nao-lida`, {}),
    onSuccess: invalidarConversa,
    onError: showApiError,
  });
  const pausar = useMutation({
    mutationFn: async (args: { ate: string | null }) => apiClient.post(`${base}/pausa`, args),
    onSuccess: async () => {
      await Promise.all([invalidarPausa(), invalidarConversa()]);
    },
    onError: showApiError,
  });
  const retomar = useMutation({
    mutationFn: async () => apiClient.delete(`${base}/pausa`),
    onSuccess: async () => {
      await Promise.all([invalidarPausa(), invalidarConversa()]);
    },
    onError: showApiError,
  });

  return {
    eventos: eventos.data ?? [],
    carregandoEventos: eventos.isLoading,
    pausa: pausa.data ?? null,
    entrarEmEspera,
    sairDaEspera,
    encerrar,
    reabrir,
    marcarNaoLida,
    pausar,
    retomar,
  };
}
