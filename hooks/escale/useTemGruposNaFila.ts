"use client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";

/** A fila tem conversa de grupo? Só um sim ou não (preset e seção de grupos): o `EXISTS` do banco para na primeira, no lugar de contar todas (Q7c). A chave NÃO começa por "conversations" nem é a do total: o tempo real e as ações em massa não a refazem; um booleano que quase nunca vira de não para sim vale 5 min. */
export function useTemGruposNaFila(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["fila-tem-grupos", orgId],
    enabled: !!orgId,
    staleTime: 5 * 60_000,
    queryFn: async () =>
      (await apiClient.get<{ data: { temGrupos: boolean } }>("/api/v1/fila-da-casca/tem-grupos")).data
        .temGrupos,
  });
}
