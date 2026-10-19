"use client";
import { useQuery, type QueryClient } from "@tanstack/react-query";

import type { NegocioDoContato } from "@/app/api/v1/negocios-do-contato/route";
import { apiClient } from "@/lib/api/client";

export type { NegocioDoContato };

export const chaveDosNegociosDoContato = (contactId: string) =>
  ["negocios-do-contato", contactId] as const;

export function useNegociosDoContato(contactId: string | null) {
  return useQuery({
    queryKey: chaveDosNegociosDoContato(contactId ?? ""),
    enabled: !!contactId,
    staleTime: 30_000,
    queryFn: async () =>
      (
        await apiClient.get<{ data: NegocioDoContato[] }>(
          `/api/v1/negocios-do-contato?contact_id=${contactId}`,
        )
      ).data,
  });
}

export function invalidarNegociosDoContato(qc: QueryClient, contactId: string): void {
  void qc.invalidateQueries({ queryKey: chaveDosNegociosDoContato(contactId) });
}
