"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { FiltrosDeContatos } from "@/lib/escale/contatos/filtros";
import type { FiltroDaLista, ListaComFiltros } from "@/lib/escale/listas/filtros-salvos";

/** Os filtros salvos de uma lista da casca (fork Escale, Fase 2B). Toda escrita devolve a lista. */
export const chaveDosFiltrosDaLista = (lista: ListaComFiltros) =>
  ["filtros-das-listas", lista] as const;

export function useFiltrosDaLista(lista: ListaComFiltros) {
  return useQuery({
    queryKey: chaveDosFiltrosDaLista(lista),
    queryFn: async () =>
      (await apiClient.get<{ data: FiltroDaLista[] }>(`/api/v1/filtros-das-listas?lista=${lista}`))
        .data,
    staleTime: 60_000,
  });
}

export function useCriarFiltroDaLista(lista: ListaComFiltros) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (novo: {
      nome: string;
      compartilhado: boolean;
      criterios: FiltrosDeContatos;
    }) =>
      (
        await apiClient.post<{ data: { id: string; filtros: FiltroDaLista[] } }>(
          "/api/v1/filtros-das-listas",
          {
            lista,
            ...novo,
          },
        )
      ).data,
    onSuccess: (r) => qc.setQueryData(chaveDosFiltrosDaLista(lista), r.filtros),
  });
}

export function useMudarFiltroDaLista(lista: ListaComFiltros) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...mudar }: { id: string; nome?: string; compartilhado?: boolean }) =>
      (await apiClient.patch<{ data: FiltroDaLista[] }>(`/api/v1/filtros-das-listas/${id}`, mudar))
        .data,
    onSuccess: (filtros) => qc.setQueryData(chaveDosFiltrosDaLista(lista), filtros),
  });
}

export function useExcluirFiltroDaLista(lista: ListaComFiltros) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.delete<{ data: FiltroDaLista[] }>(`/api/v1/filtros-das-listas/${id}`)).data,
    onSuccess: (filtros) => qc.setQueryData(chaveDosFiltrosDaLista(lista), filtros),
  });
}
