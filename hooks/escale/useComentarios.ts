"use client";
import { useMutation, useQuery, type UseQueryResult } from "@tanstack/react-query";

import { useChannelSessions, type ChannelSession } from "@/hooks/channels/useChannelSessions";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import { PLATAFORMAS_DE_COMENTARIO, type PlataformaDeComentario } from "@/lib/escale/comentarios/constantes";
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
