"use client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { CampoDaCapa } from "@/lib/escale/capa/tipos";

/**
 * O catálogo dos campos personalizados do negócio de TODAS as origens que a
 * pessoa enxerga (fork Escale, Fase 1E). A janela "Personalizar cards" usa para
 * soltar o campo apagado de todas e mostrar o que só existe em outra origem.
 * Sem repetição: se falhar, a janela abre sem o catálogo e não solta nada.
 */
export const CHAVE_DOS_CAMPOS_DAS_ORIGENS = ["campos-das-origens"] as const;

export function useCamposDasOrigens() {
  return useQuery({
    queryKey: CHAVE_DOS_CAMPOS_DAS_ORIGENS,
    queryFn: async () =>
      (await apiClient.get<{ data: { campos: CampoDaCapa[] } }>("/api/v1/capas-do-card/campos"))
        .data.campos,
    staleTime: 30_000,
    retry: false,
  });
}
