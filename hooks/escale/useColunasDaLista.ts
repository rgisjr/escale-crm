"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { type ListaComColunas, PADRAO_POR_LISTA } from "@/lib/escale/colunas/banco";
import type { ItemDeColuna } from "@/lib/escale/contatos/regras";

const chave = (lista: ListaComColunas) => ["colunas-da-lista", lista] as const;

/** As colunas que a pessoa escolheu (fork Escale, Fase 2A). Enquanto carrega, o padrão. */
export function useColunasDaLista(lista: ListaComColunas) {
  const q = useQuery({
    queryKey: chave(lista),
    queryFn: async () =>
      (
        await apiClient.get<{ data: { itens: ItemDeColuna[] } }>(
          `/api/v1/colunas-das-listas?lista=${lista}`,
        )
      ).data.itens,
    staleTime: 5 * 60_000,
  });
  return { itens: q.data ?? [...PADRAO_POR_LISTA[lista]], carregando: q.isLoading };
}

export function useSalvarColunasDaLista(lista: ListaComColunas) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itens: ItemDeColuna[]) =>
      (
        await apiClient.put<{ data: { itens: ItemDeColuna[] } }>("/api/v1/colunas-das-listas", {
          lista,
          itens,
        })
      ).data.itens,
    onMutate: (itens) => {
      const antes = qc.getQueryData<ItemDeColuna[]>(chave(lista));
      qc.setQueryData(chave(lista), itens);
      return { antes };
    },
    onError: (_e, _itens, ctx) => qc.setQueryData(chave(lista), ctx?.antes),
    onSuccess: (itens) => qc.setQueryData(chave(lista), itens),
  });
}
