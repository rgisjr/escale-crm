"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { PrefsDoCard } from "@/lib/escale/capa/tipos";

/** A preferência "Personalizar cards" da pessoa (fork Escale, Fase 1E). `null` = o padrão da Clint. */
const ROTA = "/api/v1/capas-do-card";
export const CHAVE_DAS_PREFS = ["prefs-do-card"] as const;

export function usePrefsDoCard() {
  return useQuery({
    queryKey: CHAVE_DAS_PREFS,
    queryFn: async () =>
      (await apiClient.get<{ data: { prefs: PrefsDoCard | null } }>(ROTA)).data.prefs,
    staleTime: 5 * 60_000,
  });
}

export function useSalvarPrefsDoCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: PrefsDoCard) =>
      apiClient.put<{ data: { prefs: PrefsDoCard } }>(ROTA, { prefs }),
    // Vale em todas as origens: a cache é uma só, e os quadros abertos repintam.
    onSuccess: (resposta) => qc.setQueryData(CHAVE_DAS_PREFS, resposta.data.prefs),
  });
}
