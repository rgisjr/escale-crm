"use client";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { agendarRecargaDasConversas } from "@/hooks/inbox/recargaDasConversas";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";
import { useRefetchDeSeguranca } from "@/hooks/realtime/useRefetchDeSeguranca";
import { apiClient } from "@/lib/api/client";
import type { FiltrosDaFila } from "@/lib/escale/conversas/presets";

export interface PaginaDaFila {
  data: ConversationWithContact[];
  meta?: { cursor?: string | null; has_more?: boolean };
}

export const LIMITE_DA_FILA = 50;

/**
 * A FILA DA CASCA (fork Escale, Fase 3A; A4, A5). Lê a rota do original com
 * os presets da Clint por cima. A chave começa por "conversations" de
 * propósito: `agendarRecargaDasConversas` (tempo real do original) invalida
 * `["conversations"]` e alcança esta lista sem nenhuma linha nova lá.
 */
export const chaveDaFila = (filtros: FiltrosDaFila) =>
  ["conversations", { casca: true, ...filtros }] as const;

export function urlDaFila(filtros: FiltrosDaFila, cursor?: string): string {
  const qs = new URLSearchParams();
  if (filtros.status?.length) qs.set("status", filtros.status.join(","));
  if (filtros.assigned_to) qs.set("assigned_to", filtros.assigned_to);
  if (filtros.unread) qs.set("unread", "true");
  if (filtros.snoozed !== undefined) qs.set("snoozed", filtros.snoozed ? "true" : "false");
  if (filtros.ordem === "espera") qs.set("ordem", "espera");
  if (filtros.search) qs.set("search", filtros.search);
  if (cursor) qs.set("cursor", cursor);
  qs.set("limit", String(LIMITE_DA_FILA));
  return `/api/v1/conversations?${qs.toString()}`;
}

export function useFilaDeConversas(filtros: FiltrosDaFila, orgId: string | null) {
  const qc = useQueryClient();
  const queryKey = useMemo(() => chaveDaFila(filtros), [filtros]);

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      try {
        return await apiClient.get<PaginaDaFila>(urlDaFila(filtros, pageParam));
      } catch (err) {
        showApiError(err);
        throw err;
      }
    },
    getNextPageParam: (ultima) =>
      ultima.meta?.has_more && ultima.meta.cursor ? ultima.meta.cursor : undefined,
    refetchOnWindowFocus: true,
  });

  const onChange = useCallback(() => agendarRecargaDasConversas(qc), [qc]);
  const { status: realtimeStatus, ultimaEntrega } = useRealtimeChannel({
    name: orgId ? `inbox-${orgId}` : "inbox-disabled",
    postgresChanges: orgId
      ? {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `organization_id=eq.${orgId}`,
        }
      : undefined,
    onChange,
    enabled: !!orgId,
  });
  const seguranca = useRefetchDeSeguranca<{ pages: PaginaDaFila[] }>({
    queryKey,
    assinatura: (d) => {
      let maior = "";
      for (const c of d?.pages.flatMap((p) => p.data) ?? []) {
        const t = c.last_message_at ?? "";
        if (t > maior) maior = t;
      }
      return `${maior}:${d?.pages.reduce((n, p) => n + p.data.length, 0) ?? 0}`;
    },
    ultimaEntrega,
    enabled: !!orgId,
  });

  return { ...query, realtimeStatus, seguranca };
}
