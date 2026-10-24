"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";
import { apiClient } from "@/lib/api/client";
import type { StatusDaCampanha } from "@/lib/campanhas/tipos";
import {
  PARAM_DOS_FILTROS,
  textoDosFiltros,
  type FiltrosDeCampanhas,
} from "@/lib/escale/campanhas/filtros";
import type { PaginaDeCampanhas, ResumoDasCampanhas } from "@/lib/escale/campanhas/tipos";

/**
 * OS DADOS DA LISTA DE CAMPANHAS DA CASCA (fork Escale, Fase 8A). A lista e o
 * resumo nas rotas do fork; o tempo real sobre `campaigns` (9301, N12); as
 * ações: pausar, retomar, cancelar e duplicar pelas rotas do original,
 * reagendar, voltar a rascunho e excluir pelas do fork.
 */
export const CHAVE_DAS_CAMPANHAS = "campanhas-da-casca";
export const RECONSULTA_MS = 10_000;
const ANDANDO: ReadonlySet<StatusDaCampanha> = new Set(["preparing", "running"]);

export function reconsultaDaLista(p: PaginaDeCampanhas | undefined): number | false {
  return p?.linhas.some((l) => ANDANDO.has(l.status)) ? RECONSULTA_MS : false;
}

function consulta(filtros: FiltrosDeCampanhas, extra: Record<string, string>): string {
  const qs = new URLSearchParams(extra);
  const f = textoDosFiltros(filtros);
  if (f !== "{}") qs.set(PARAM_DOS_FILTROS, f);
  return qs.toString();
}

export function useListaDeCampanhas(
  filtros: FiltrosDeCampanhas,
  pagina: number,
  porPagina: number,
) {
  return useQuery({
    queryKey: [CHAVE_DAS_CAMPANHAS, "lista", textoDosFiltros(filtros), pagina, porPagina],
    queryFn: async () =>
      (
        await apiClient.get<{ data: PaginaDeCampanhas }>(
          `/api/v1/campanhas-da-casca?${consulta(filtros, { p: String(pagina), n: String(porPagina) })}`,
        )
      ).data,
    placeholderData: keepPreviousData,
    refetchInterval: (q) => reconsultaDaLista(q.state.data),
  });
}

export function useResumoDasCampanhas(filtros: FiltrosDeCampanhas, aberto: boolean) {
  const qs = consulta(filtros, {});
  return useQuery({
    queryKey: [CHAVE_DAS_CAMPANHAS, "resumo", textoDosFiltros(filtros)],
    enabled: aberto,
    queryFn: async () =>
      (
        await apiClient.get<{ data: ResumoDasCampanhas }>(
          `/api/v1/campanhas-da-casca/resumo${qs ? `?${qs}` : ""}`,
        )
      ).data,
  });
}

export function useCampanhasAoVivo(organizacaoId: string): void {
  const qc = useQueryClient();
  useRealtimeChannel({
    name: `campanhas-da-casca:${organizacaoId}`,
    postgresChanges: {
      event: "*",
      table: "campaigns",
      filter: `organization_id=eq.${organizacaoId}`,
    },
    onChange: () => {
      void qc.invalidateQueries({ queryKey: [CHAVE_DAS_CAMPANHAS] });
    },
    enabled: organizacaoId !== "",
  });
}

export type PedidoDeAcao =
  | { id: string; acao: "pausar" | "retomar" | "cancelar" | "duplicar" | "rascunho" | "excluir" }
  | { id: string; acao: "reagendar"; quando: string };

export function caminhoDaAcao(p: PedidoDeAcao): {
  metodo: "post" | "delete";
  url: string;
  corpo?: Record<string, unknown>;
} {
  switch (p.acao) {
    case "reagendar":
      return {
        metodo: "post",
        url: `/api/v1/campanhas-da-casca/${p.id}/reagendar`,
        corpo: { scheduled_at: p.quando },
      };
    case "rascunho":
      return { metodo: "post", url: `/api/v1/campanhas-da-casca/${p.id}/rascunho` };
    // FORK ESCALE · Fase 8B (N17): a cópia leva também o que o assistente guarda.
    case "duplicar":
      return { metodo: "post", url: `/api/v1/campanhas-da-casca/${p.id}/duplicar` };
    case "excluir":
      return { metodo: "delete", url: `/api/v1/campanhas-da-casca/${p.id}` };
    default:
      return { metodo: "post", url: `/api/v1/campaigns/${p.id}/${p.acao}` };
  }
}

export function useAcoesDaCampanha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: PedidoDeAcao): Promise<Record<string, unknown>> => {
      const c = caminhoDaAcao(p);
      const r =
        c.metodo === "delete"
          ? await apiClient.delete<{ data?: Record<string, unknown> }>(c.url)
          : await apiClient.post<{ data?: Record<string, unknown> }>(c.url, c.corpo ?? {});
      return r?.data ?? {};
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CHAVE_DAS_CAMPANHAS] });
      // A lista do original (sem a casca) também fica fresca.
      void qc.invalidateQueries({ queryKey: ["campanhas"] });
    },
  });
}
