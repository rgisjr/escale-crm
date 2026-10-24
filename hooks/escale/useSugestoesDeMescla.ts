"use client";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { ResultadoDaMescla } from "@/lib/escale/mescla/banco";
import type { ConsultaDeSugestoes, Escolhas, Prioridade, Sugestao } from "@/lib/escale/mescla/regras";

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

const POR_PAGINA = 20;
type Pagina = { data: Sugestao[]; meta?: { total?: number } };
export type FiltroDasSugestoes = Omit<ConsultaDeSugestoes, "p" | "n">;

function paraUrl(consulta: FiltroDasSugestoes, p: number, n: number): string {
  const busca = new URLSearchParams({ ordem: consulta.ordem, p: String(p), n: String(n) });
  if (consulta.q) busca.set("q", consulta.q);
  if (consulta.regras.length > 0) busca.set("regras", consulta.regras.join(","));
  if (consulta.min > 0) busca.set("min", String(consulta.min));
  if (consulta.max < 100) busca.set("max", String(consulta.max));
  if (consulta.tags.length > 0) busca.set("tags", consulta.tags.join(","));
  if (consulta.validos) busca.set("validos", "1");
  if (consulta.contato) busca.set("contato", consulta.contato);
  return `/api/v1/mesclas/sugestoes?${busca.toString()}`;
}

export function useSugestoesDeMescla(consulta: FiltroDasSugestoes, habilitado: boolean) {
  const q = useInfiniteQuery({
    queryKey: ["sugestoes-de-mescla", "lista", consulta],
    enabled: habilitado,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => apiClient.get<Pagina>(paraUrl(consulta, pageParam, POR_PAGINA)),
    getNextPageParam: (ultima, todas) =>
      todas.length * POR_PAGINA < (ultima.meta?.total ?? 0) ? todas.length + 1 : undefined,
  });
  return {
    sugestoes: q.data?.pages.flatMap((p) => p.data) ?? [],
    total: q.data?.pages[0]?.meta?.total ?? 0,
    temMais: !!q.hasNextPage,
    carregarMais: () => void q.fetchNextPage(),
    isLoading: q.isLoading,
    isError: q.isError,
  };
}

export function useTotalDeSugestoes(habilitado: boolean): number {
  const q = useQuery({
    queryKey: ["sugestoes-de-mescla", "total"],
    enabled: habilitado,
    staleTime: 60_000,
    queryFn: async () => apiClient.get<Pagina>("/api/v1/mesclas/sugestoes?n=0"),
  });
  return q.data?.meta?.total ?? 0;
}

export function useMesclar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido: { principal_id: string; secundarios: string[]; escolhas: Escolhas }) =>
      (await apiClient.post<{ data: ResultadoDaMescla }>("/api/v1/mesclas", pedido)).data,
    onSuccess: () => void qc.invalidateQueries(),
  });
}

export function useMesclarEmMassa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido: { grupos: string[][]; prioridade: Prioridade }) =>
      (
        await apiClient.post<{ data: { mesclados: ResultadoDaMescla[]; falhas: Array<{ grupo: string[]; erro: string }> } }>(
          "/api/v1/mesclas/em-massa",
          pedido,
        )
      ).data,
    onSuccess: () => void qc.invalidateQueries(),
  });
}
