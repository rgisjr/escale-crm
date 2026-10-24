"use client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { FichaDeNegociosDoContato } from "@/lib/escale/ficha-do-contato/banco";

/** OS NEGÓCIOS DO CONTATO NA JANELA DO CONTATO (fork Escale, Fase 2E; N9) e os nomes das etapas deles. (O `useNegociosDoContato` da 3A é o do painel de Conversas.) */
export const chaveDaFichaDeNegociosDoContato = (contatoId: string) => ["ficha-de-negocios-do-contato", contatoId] as const;

export function useFichaDeNegociosDoContato(contatoId: string | null) {
  return useQuery({
    queryKey: chaveDaFichaDeNegociosDoContato(contatoId ?? ""),
    enabled: !!contatoId,
    queryFn: async () =>
      (await apiClient.get<{ data: FichaDeNegociosDoContato }>(`/api/v1/contatos/${contatoId}/negocios`)).data,
  });
}
