"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { apiClient } from "@/lib/api/client";
import type {
  AgendadaLida,
  ListaDeAgendadas,
  NovaAgendada,
} from "@/lib/escale/conversas/agendadas";

export type FiltrosDeAgendadas = Partial<ListaDeAgendadas> & { status?: "pendente" | "falhou" };
export interface PaginaDeAgendadas {
  data: AgendadaLida[];
  meta: { total: number; pagina: number; por_pagina: number };
}
export const CHAVE_DAS_AGENDADAS = ["mensagens-agendadas"] as const;
export const CHAVE_DA_CONTAGEM = ["agendadas-contagem"] as const;

/** A URL com só os filtros preenchidos, em ordem fixa (a chave do cache é estável). */
export function urlDasAgendadas(f: FiltrosDeAgendadas): string {
  const p = new URLSearchParams();
  const ordem: Array<keyof FiltrosDeAgendadas> = [
    "busca",
    "criacao_de",
    "criacao_ate",
    "envio_de",
    "envio_ate",
    "channel_session_id",
    "contact_id",
    "conversation_id",
    "status",
    "pagina",
    "por_pagina",
  ];
  for (const k of ordem) {
    const v = f[k];
    if (v !== undefined && v !== null && String(v) !== "") p.set(k, String(v));
  }
  const qs = p.toString();
  return `/api/v1/mensagens-agendadas${qs ? `?${qs}` : ""}`;
}

export function useMensagensAgendadas(filtros: FiltrosDeAgendadas, enabled = true) {
  const url = urlDasAgendadas(filtros);
  return useQuery({
    queryKey: [...CHAVE_DAS_AGENDADAS, url],
    enabled,
    queryFn: async () => apiClient.get<PaginaDeAgendadas>(url),
    staleTime: 15_000,
  });
}

function useInvalidarAgendadas() {
  const qc = useQueryClient();
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: CHAVE_DAS_AGENDADAS }),
      qc.invalidateQueries({ queryKey: CHAVE_DA_CONTAGEM }),
    ]);
  };
}

export function useAgendarMensagens() {
  const invalidar = useInvalidarAgendadas();
  return useMutation({
    mutationFn: async (nova: NovaAgendada) =>
      apiClient.post<{ data: { ids: string[] } }>("/api/v1/mensagens-agendadas", nova),
    onSuccess: invalidar,
    onError: showApiError,
  });
}

export function useRemoverAgendada() {
  const invalidar = useInvalidarAgendadas();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/api/v1/mensagens-agendadas/${id}`),
    onSuccess: invalidar,
    onError: showApiError,
  });
}

/** O "⏱ n" da fila: uma chamada por página de ids (ordenados, para a chave não mudar com a ordem da lista). */
export function useContagemDeAgendadas(conversationIds: readonly string[]): Record<string, number> {
  const ids = [...new Set(conversationIds)].sort();
  const q = useQuery({
    queryKey: [...CHAVE_DA_CONTAGEM, ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () =>
      apiClient.get<{ data: Record<string, number> }>(
        `/api/v1/mensagens-agendadas/contagem?conversation_ids=${encodeURIComponent(ids.join(","))}`,
      ),
    select: (r) => r.data,
    staleTime: 30_000,
  });
  return q.data ?? {};
}
