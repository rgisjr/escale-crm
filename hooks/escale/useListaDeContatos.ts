"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { PaginaDeContatos } from "@/lib/escale/contatos/lista";
import type { VisaoDeContatos } from "@/lib/escale/contatos/regras";

export type ConsultaDaTela = { q?: string; v: VisaoDeContatos; p: number; n: number };

/**
 * A página da lista de contatos da casca (fork Escale, Fase 2A). A chave começa
 * por `["contacts"]`: toda escrita de contato do original (criar, editar,
 * excluir, juntar) já invalida esse prefixo, e a lista se refaz sozinha.
 */
export function useListaDeContatos(consulta: ConsultaDaTela) {
  return useQuery({
    queryKey: ["contacts", "lista-da-casca", consulta],
    queryFn: async () => {
      const qs = new URLSearchParams({
        v: consulta.v,
        p: String(consulta.p),
        n: String(consulta.n),
      });
      if (consulta.q?.trim()) qs.set("q", consulta.q.trim());
      const res = await apiClient.get<{ data: PaginaDeContatos }>(
        `/api/v1/lista-de-contatos?${qs}`,
      );
      return res.data;
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
