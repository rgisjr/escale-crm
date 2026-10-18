"use client";
import { useQuery } from "@tanstack/react-query";

import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { apiClient } from "@/lib/api/client";
import { MAX_SESSOES } from "@/lib/escale/negocio/conversas";

/**
 * TODAS AS SESSÕES DO CONTATO (fork Escale, Fase 1H; C16). A rota do original
 * já aceita `contact_id`; o hook do Inbox não o envia, então este é do fork.
 * A RLS de `conversations` decide o que entra (visibility_mode).
 */
export const chaveDasConversasDoContato = (contactId: string) =>
  ["conversas-do-contato", contactId] as const;

export function useConversasDoContato(contactId: string | null) {
  return useQuery({
    queryKey: chaveDasConversasDoContato(contactId ?? ""),
    enabled: !!contactId,
    queryFn: async () =>
      (
        await apiClient.get<{ data: ConversationWithContact[] }>(
          `/api/v1/conversations?contact_id=${contactId}&limit=${MAX_SESSOES}`,
        )
      ).data,
  });
}
