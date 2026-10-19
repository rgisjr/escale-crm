"use client";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { agendarRecargaDasConversas } from "@/hooks/inbox/recargaDasConversas";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";
import { useRefetchDeSeguranca } from "@/hooks/realtime/useRefetchDeSeguranca";
import { apiClient } from "@/lib/api/client";
import {
  enxugarFiltrosDoPainel,
  temCriterios,
  type FiltrosDoPainel,
} from "@/lib/escale/conversas/filtros-da-fila";
import type { Ordem } from "@/lib/escale/conversas/ordem";

export interface PaginaDaFila {
  data: ConversationWithContact[];
  meta?: { cursor?: string | null; has_more?: boolean };
}

export const LIMITE_DA_FILA = 50;

/**
 * A FILA DA CASCA (fork Escale, Fase 3A; A4, A5). A chave começa por
 * "conversations" de propósito: `agendarRecargaDasConversas` (tempo real do
 * original) invalida `["conversations"]` e alcança esta lista sem nenhuma linha
 * nova lá.
 *
 * FORK ESCALE · Fase 3D: lê /api/v1/fila-da-casca (o painel de filtros no banco); a chave continua "conversations".
 */
/** FORK ESCALE · Fase 3D: o painel, a ordem e a busca (a rota da casca avalia no banco, N9). */
export interface ConsultaDaFila {
  painel: FiltrosDoPainel;
  ordem: Ordem;
  busca?: string;
}

export const chaveDaFila = (consulta: ConsultaDaFila) =>
  ["conversations", { casca: true, ...consulta }] as const;

export function parametrosDaConsulta(consulta: ConsultaDaFila): URLSearchParams {
  const qs = new URLSearchParams();
  const painel = enxugarFiltrosDoPainel(consulta.painel);
  if (temCriterios(painel)) qs.set("f", JSON.stringify(painel));
  if (consulta.busca) qs.set("q", consulta.busca);
  if (consulta.ordem === "espera") qs.set("o", "espera");
  return qs;
}

export function urlDaFila(consulta: ConsultaDaFila, cursor?: string): string {
  const qs = parametrosDaConsulta(consulta);
  if (cursor) qs.set("cursor", cursor);
  qs.set("limit", String(LIMITE_DA_FILA));
  return `/api/v1/fila-da-casca?${qs.toString()}`;
}

export function useFilaDeConversas(consulta: ConsultaDaFila, orgId: string | null) {
  const qc = useQueryClient();
  const queryKey = useMemo(() => chaveDaFila(consulta), [consulta]);

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      try {
        return await apiClient.get<PaginaDaFila>(urlDaFila(consulta, pageParam));
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
