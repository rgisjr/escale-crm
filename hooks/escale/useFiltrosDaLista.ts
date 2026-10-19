"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type {
  CriteriosDaLista,
  FiltroDaLista,
  ListaComFiltros,
} from "@/lib/escale/listas/filtros-salvos";

/** Os filtros salvos de uma lista da casca (fork Escale, Fases 2B e 3D). Toda escrita devolve a lista. */
export const chaveDosFiltrosDaLista = (lista: ListaComFiltros) =>
  ["filtros-das-listas", lista] as const;

export function useFiltrosDaLista<L extends ListaComFiltros>(lista: L) {
  return useQuery({
    queryKey: chaveDosFiltrosDaLista(lista),
    queryFn: async () =>
      (
        await apiClient.get<{ data: FiltroDaLista<L>[] }>(
          `/api/v1/filtros-das-listas?lista=${lista}`,
        )
      ).data,
    staleTime: 60_000,
  });
}

export function useCriarFiltroDaLista<L extends ListaComFiltros>(lista: L) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (novo: {
      nome: string;
      compartilhado: boolean;
      criterios: CriteriosDaLista<L>;
    }) =>
      (
        await apiClient.post<{ data: { id: string; filtros: FiltroDaLista<L>[] } }>(
          "/api/v1/filtros-das-listas",
          { lista, ...novo },
        )
      ).data,
    onSuccess: (r) => qc.setQueryData(chaveDosFiltrosDaLista(lista), r.filtros),
  });
}

export function useMudarFiltroDaLista<L extends ListaComFiltros>(lista: L) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...mudar }: { id: string; nome?: string; compartilhado?: boolean }) =>
      (
        await apiClient.patch<{ data: FiltroDaLista<L>[] }>(
          `/api/v1/filtros-das-listas/${id}`,
          mudar,
        )
      ).data,
    onSuccess: (filtros) => qc.setQueryData(chaveDosFiltrosDaLista(lista), filtros),
  });
}

export function useExcluirFiltroDaLista<L extends ListaComFiltros>(lista: L) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.delete<{ data: FiltroDaLista<L>[] }>(`/api/v1/filtros-das-listas/${id}`))
        .data,
    onSuccess: (filtros) => qc.setQueryData(chaveDosFiltrosDaLista(lista), filtros),
  });
}
