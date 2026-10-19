"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { apiClient } from "@/lib/api/client";
import type { NovaResposta, RespostaLida } from "@/lib/escale/conversas/respostas";

export interface FiltrosDeRespostas {
  busca?: string;
  setor?: string;
  pagina: number;
  por_pagina: number;
}
export interface PaginaDeRespostas {
  data: RespostaLida[];
  meta: { total: number; pagina: number; por_pagina: number };
}

export function urlDasRespostas(f: FiltrosDeRespostas): string {
  const p = new URLSearchParams();
  if (f.busca?.trim()) p.set("busca", f.busca.trim());
  if (f.setor) p.set("setor", f.setor);
  p.set("pagina", String(f.pagina));
  p.set("por_pagina", String(f.por_pagina));
  return `/api/v1/respostas-rapidas?${p.toString()}`;
}

export function useRespostasRapidas(filtros: FiltrosDeRespostas) {
  const url = urlDasRespostas(filtros);
  return useQuery({
    queryKey: ["respostas-rapidas", url],
    queryFn: async () => apiClient.get<PaginaDeRespostas>(url),
    staleTime: 15_000,
  });
}

function useInvalidarRespostas() {
  const qc = useQueryClient();
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["respostas-rapidas"] }),
      qc.invalidateQueries({ queryKey: ["respostas-da-conversa"] }),
      qc.invalidateQueries({ queryKey: ["message-templates"] }),
    ]);
  };
}

export function useSalvarResposta() {
  const invalidar = useInvalidarRespostas();
  return useMutation({
    mutationFn: async ({ id, ...r }: { id?: string } & NovaResposta) =>
      id
        ? apiClient.patch<{ data: { id: string } }>(`/api/v1/respostas-rapidas/${id}`, r)
        : apiClient.post<{ data: { id: string } }>("/api/v1/respostas-rapidas", r),
    onSuccess: invalidar,
    onError: showApiError,
  });
}

export function useExcluirResposta() {
  const invalidar = useInvalidarRespostas();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/api/v1/respostas-rapidas/${id}`),
    onSuccess: invalidar,
    onError: showApiError,
  });
}

/** O painel do compositor (N14): só as do canal e do setor da conversa. */
export function useRespostasDaConversa(
  conversationId: string | null,
  setor: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["respostas-da-conversa", conversationId, setor],
    enabled: enabled && !!conversationId,
    queryFn: async () =>
      apiClient.get<{
        data: {
          respostas: RespostaLida[];
          setorDaConversa: string | null;
          podeOutrosSetores: boolean;
        };
      }>(
        `/api/v1/respostas-rapidas/da-conversa?conversation_id=${conversationId}${setor ? `&setor=${setor}` : ""}`,
      ),
    select: (r) => r.data,
    staleTime: 30_000,
  });
}
