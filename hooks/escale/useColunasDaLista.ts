"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showApiError } from "@/components/feedback/ApiErrorToast";
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
  const gravacoesEmVoo = () => qc.isMutating({ mutationKey: chave(lista) });
  return useMutation({
    mutationKey: chave(lista),
    mutationFn: async (itens: ItemDeColuna[]) =>
      (
        await apiClient.put<{ data: { itens: ItemDeColuna[] } }>("/api/v1/colunas-das-listas", {
          lista,
          itens,
        })
      ).data.itens,
    onMutate: async (itens) => {
      // Duas marcações seguidas: a resposta da primeira não pode sobrescrever a segunda.
      await qc.cancelQueries({ queryKey: chave(lista) });
      const antes = qc.getQueryData<ItemDeColuna[]>(chave(lista));
      qc.setQueryData(chave(lista), itens);
      return { antes };
    },
    onError: (erro, _itens, ctx) => {
      qc.setQueryData(chave(lista), ctx?.antes);
      showApiError(erro);
    },
    // Com outra gravação em voo, a resposta desta não pode sobrescrever a marcação mais nova.
    onSuccess: (itens) => {
      if (gravacoesEmVoo() <= 1) qc.setQueryData(chave(lista), itens);
    },
    onSettled: () => {
      if (gravacoesEmVoo() <= 1) void qc.invalidateQueries({ queryKey: chave(lista) });
    },
  });
}
