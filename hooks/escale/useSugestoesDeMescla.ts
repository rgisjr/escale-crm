"use client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { Sugestao } from "@/lib/escale/mescla/regras";

/** AS SUGESTÕES DE MESCLA DA CASCA (fork Escale, Fase 2E; C2). Só para gerente ou acima. */
export function useSugestaoDoContato(contatoId: string | null, habilitado: boolean): Sugestao | null {
  const consulta = useQuery({
    queryKey: ["sugestoes-de-mescla", "do-contato", contatoId],
    enabled: habilitado && !!contatoId,
    staleTime: 60_000,
    queryFn: async () =>
      (await apiClient.get<{ data: Sugestao[] }>(`/api/v1/mesclas/sugestoes?contato=${contatoId}&n=1`)).data,
  });
  return consulta.data?.[0] ?? null;
}
