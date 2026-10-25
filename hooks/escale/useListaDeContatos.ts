"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { PaginaDeContatos } from "@/lib/escale/contatos/lista";
import type { VisaoDeContatos } from "@/lib/escale/contatos/regras";

export type ConsultaDaTela = { q?: string; v: VisaoDeContatos; p: number; n: number; f?: string | null };

/** A página mais o total da consulta: o que a tela sempre leu, agora de duas chamadas. */
export type ListaDeContatosDaTela = PaginaDeContatos & { total: number };

function paramsDaBusca(consulta: Pick<ConsultaDaTela, "q" | "v" | "f">): URLSearchParams {
  const qs = new URLSearchParams({ v: consulta.v });
  if (consulta.q?.trim()) qs.set("q", consulta.q.trim());
  if (consulta.f) qs.set("f", consulta.f);
  return qs;
}

/**
 * A página da lista de contatos da casca (fork Escale, Fase 2A). A chave começa
 * por `["contacts"]`: toda escrita de contato do original (criar, editar,
 * excluir, juntar) já invalida esse prefixo, e a lista se refaz sozinha.
 *
 * Q7d: o total é uma chamada à parte, com chave SEM página nem tamanho — trocar de
 * página reaproveita o total já lido, e só a página vai ao banco. A mesma forma de
 * antes sai daqui (`data.total`); `data` só existe quando as duas já chegaram.
 */
export function useListaDeContatos(consulta: ConsultaDaTela) {
  const { q, v, f } = consulta;
  const pagina = useQuery({
    queryKey: ["contacts", "lista-da-casca", consulta],
    queryFn: async () => {
      const qs = paramsDaBusca(consulta);
      qs.set("p", String(consulta.p));
      qs.set("n", String(consulta.n));
      const res = await apiClient.get<{ data: PaginaDeContatos }>(
        `/api/v1/lista-de-contatos?${qs}`,
      );
      return res.data;
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
  const total = useQuery({
    queryKey: ["contacts", "total-da-casca", { q, v, f }],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { total: number } }>(
        `/api/v1/lista-de-contatos/total?${paramsDaBusca(consulta)}`,
      );
      return res.data.total;
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
  const data: ListaDeContatosDaTela | undefined =
    pagina.data !== undefined && total.data !== undefined
      ? { ...pagina.data, total: total.data }
      : undefined;
  return {
    data,
    isLoading: pagina.isLoading || total.isLoading,
    isError: pagina.isError || total.isError,
    error: pagina.error ?? total.error,
    isFetching: pagina.isFetching || total.isFetching,
    refetch: () => Promise.all([pagina.refetch(), total.refetch()]),
  };
}
