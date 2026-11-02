"use client";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { useChannelSessions, type ChannelSession } from "@/hooks/channels/useChannelSessions";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import type { ComentarioDaCaixa, PublicacaoDaCaixa } from "@/lib/escale/comentarios/caixa";
import {
  PLATAFORMAS_DE_COMENTARIO,
  type OrdemDaCaixa,
  type PeriodoDaCaixa,
  type PlataformaDeComentario,
} from "@/lib/escale/comentarios/constantes";
import type { ContaDaCaixa } from "@/lib/escale/comentarios/contas-da-caixa";
import type { PeriodoDosInsights } from "@/lib/escale/automacoes/insights/tipos";
import type { ResumoDosComentarios } from "@/lib/escale/comentarios/resumo";
import type { PublicacaoDaConta } from "@/lib/escale/comentarios/zernio";

/**
 * OS DADOS DO GATILHO DE COMENTÁRIO (fork Escale, Fase 10B): as contas do Instagram/Facebook, as
 * publicações da conta, a garantia da assinatura do webhook e os números do Insights.
 */
export interface ContaSocial {
  id: string;
  nome: string;
  plataforma: PlataformaDeComentario;
  conectada: boolean;
}

const plataformaDe = (c: ChannelSession): PlataformaDeComentario | null => {
  const p = c.metadata?.social_platform;
  return typeof p === "string" && (PLATAFORMAS_DE_COMENTARIO as readonly string[]).includes(p) ? (p as PlataformaDeComentario) : null;
};

/** As conexões `zernio_social` do Instagram e do Facebook. */
export function useContasSociais(): { contas: ContaSocial[]; carregando: boolean } {
  const { data, isLoading } = useChannelSessions();
  const contas = (data ?? []).flatMap((c): ContaSocial[] => {
    const plataforma = c.provider === "zernio_social" ? plataformaDe(c) : null;
    return plataforma
      ? [{ id: c.id, nome: c.display_name ?? c.phone_number ?? plataforma, plataforma, conectada: c.status === "WORKING" }]
      : [];
  });
  return { contas, carregando: isLoading };
}

/** O código do erro da API (`conta_desconectada`, `acesso_recusado`, `erro_ao_carregar`), para a tela escolher o texto. */
export const codigoDoErro = (erro: unknown): string => (erro instanceof ApiError ? erro.code : "erro_ao_carregar");

export function usePublicacoesDaConta(canal: string | null): UseQueryResult<PublicacaoDaConta[]> {
  return useQuery({
    queryKey: ["escale-comentarios", "publicacoes", canal],
    queryFn: async () =>
      (await apiClient.get<{ data: { publicacoes: PublicacaoDaConta[] } }>(`/api/v1/escale/comentarios/publicacoes?canal=${canal}`)).data
        .publicacoes,
    enabled: canal !== null && canal !== "",
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/** Sem toast: o painel mostra o estado ("Ligando…", aviso com "Tentar novamente"). */
export function useGarantirAssinatura() {
  return useMutation({
    mutationFn: async (canal: string) =>
      (await apiClient.post<{ data: { estado: "ja_assinada" | "assinada" } }>("/api/v1/escale/comentarios/assinatura", { canal })).data
        .estado,
  });
}

export function useResumoDosComentarios(
  ruleId: string | null,
  periodo: PeriodoDosInsights,
  ligado: boolean,
): UseQueryResult<ResumoDosComentarios> {
  return useQuery({
    queryKey: ["automation-rule-runs", "insights", "comentarios", ruleId, periodo],
    queryFn: async () =>
      (await apiClient.get<{ data: ResumoDosComentarios }>(`/api/v1/automacoes-da-casca/${ruleId}/comentarios?periodo=${periodo}`)).data,
    enabled: ligado && ruleId !== null,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/* ------------------------------------------------------------------------------------------------
 * FORK ESCALE · Fase 10A: a caixa de comentários. Leitura sob demanda do Zernio, sem cópia no banco.
 * As mutações (responder, direct, ocultar, apagar) moram em `useAcoesNoComentario.ts`.
 * ---------------------------------------------------------------------------------------------- */
export type ContaParaACaixa = Omit<ContaDaCaixa, "contaId">;
export type PaginaDePublicacoes = { publicacoes: PublicacaoDaCaixa[]; proximo: string | null };
export type PaginaDeComentarios = { comentarios: ComentarioDaCaixa[]; proximo: string | null };

const RAIZ_DA_CAIXA = "/api/v1/escale/comentarios";
const UM_MINUTO_MS = 60_000;

/** As contas do Instagram/Facebook que a pessoa atende (D7). */
export function useContasDaCaixa(): UseQueryResult<ContaParaACaixa[]> {
  return useQuery({
    queryKey: ["escale-comentarios", "caixa", "contas"],
    queryFn: async () => (await apiClient.get<{ data: { contas: ContaParaACaixa[] } }>(`${RAIZ_DA_CAIXA}/contas`)).data.contas,
    staleTime: UM_MINUTO_MS,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function usePublicacoesDaCaixa(
  canal: string | null,
  filtros: { periodo: PeriodoDaCaixa; ordem: OrdemDaCaixa },
): UseInfiniteQueryResult<InfiniteData<PaginaDePublicacoes>> {
  return useInfiniteQuery({
    queryKey: ["escale-comentarios", "caixa", canal, "publicacoes", filtros.periodo, filtros.ordem],
    queryFn: async ({ pageParam }) => {
      const busca = new URLSearchParams({ canal: canal ?? "", periodo: filtros.periodo, ordem: filtros.ordem });
      if (pageParam) busca.set("cursor", pageParam);
      return (await apiClient.get<{ data: PaginaDePublicacoes }>(`${RAIZ_DA_CAIXA}/caixa?${busca.toString()}`)).data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (ultima) => ultima.proximo,
    enabled: canal !== null && canal !== "",
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/** A chave do cache dos comentários de uma publicação (a 10D usa no "Curtir" otimista). */
export const chaveDosComentarios = (canal: string | null, publicacao: string | null) =>
  ["escale-comentarios", "caixa", canal, "publicacao", publicacao] as const;

const abaVisivel = (): boolean => typeof document === "undefined" || document.visibilityState === "visible";

export function useComentariosDaPublicacao(
  canal: string | null,
  publicacao: string | null,
): UseInfiniteQueryResult<InfiniteData<PaginaDeComentarios>> {
  return useInfiniteQuery({
    queryKey: chaveDosComentarios(canal, publicacao),
    queryFn: async ({ pageParam }) => {
      const busca = new URLSearchParams({ canal: canal ?? "" });
      if (pageParam) busca.set("cursor", pageParam);
      return (
        await apiClient.get<{ data: PaginaDeComentarios }>(
          `${RAIZ_DA_CAIXA}/caixa/${encodeURIComponent(publicacao ?? "")}?${busca.toString()}`,
        )
      ).data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (ultima) => ultima.proximo,
    enabled: canal !== null && canal !== "" && publicacao !== null && publicacao !== "",
    staleTime: 30_000,
    refetchInterval: () => (abaVisivel() ? UM_MINUTO_MS : false),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/** Troca um comentário (ou resposta) na cache sem mutar. Exportada para a 10D. */
export function trocarComentarioNaCache(
  dados: InfiniteData<PaginaDeComentarios> | undefined,
  id: string,
  troca: (c: ComentarioDaCaixa) => ComentarioDaCaixa,
): InfiniteData<PaginaDeComentarios> | undefined {
  if (!dados) return dados;
  const trocar = (c: ComentarioDaCaixa): ComentarioDaCaixa => {
    const comRespostas = { ...c, respostas: c.respostas.map(trocar) };
    return c.id === id ? troca(comRespostas) : comRespostas;
  };
  return { ...dados, pages: dados.pages.map((p) => ({ ...p, comentarios: p.comentarios.map(trocar) })) };
}

/** Tira um comentário (de primeiro nível ou resposta) da cache sem mutar. */
export function tirarComentarioDaCache(
  dados: InfiniteData<PaginaDeComentarios> | undefined,
  id: string,
): InfiniteData<PaginaDeComentarios> | undefined {
  if (!dados) return dados;
  const tirar = (lista: ComentarioDaCaixa[]): ComentarioDaCaixa[] =>
    lista.filter((c) => c.id !== id).map((c) => ({ ...c, respostas: tirar(c.respostas) }));
  return { ...dados, pages: dados.pages.map((p) => ({ ...p, comentarios: tirar(p.comentarios) })) };
}
