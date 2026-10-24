"use client";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";
import { apiClient } from "@/lib/api/client";
import {
  PAGINA_DO_HISTORICO,
  ehAutomacao,
  tiposDoGrupo,
  type ChaveDoGrupo,
} from "@/lib/escale/negocio/historico";
import type { AlvoDaNota } from "@/lib/escale/negocio/notas";
import type { TimelineItemView } from "@/lib/types/contacts";

/**
 * O HISTÓRICO PAGINADO (fork Escale, Fase 1H; C18). A rota do original pagina
 * por cursor e filtra por `type`; o `useLeadTimeline` lê só a primeira página,
 * por isso este hook. Tempo real: INSERT em crm_lead_activities invalida.
 */
type Pagina = { data: TimelineItemView[]; meta?: { has_more?: boolean; cursor?: string | null } };

export const chaveDoHistorico = (id: string, grupo: ChaveDoGrupo) => ["timeline", id, "historico", grupo] as const;

const rotaDoHistorico = (alvo: AlvoDaNota) =>
  alvo.tipo === "negocio" ? `/api/v1/leads/${alvo.id}/timeline` : `/api/v1/contacts/${alvo.id}/timeline`;

/** FORK ESCALE · Fases 1H e 2E: o histórico paginado do negócio ou do contato (N8). */
export function useHistorico(alvo: AlvoDaNota, grupo: ChaveDoGrupo) {
  const qc = useQueryClient();
  const tipos = tiposDoGrupo(grupo);
  const consulta = useInfiniteQuery({
    queryKey: chaveDoHistorico(alvo.id, grupo),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const busca = new URLSearchParams({ limit: String(PAGINA_DO_HISTORICO) });
      for (const tipo of tipos ?? []) busca.append("type", tipo);
      if (pageParam) busca.set("cursor", pageParam);
      return apiClient.get<Pagina>(`${rotaDoHistorico(alvo)}?${busca.toString()}`);
    },
    getNextPageParam: (ultima) => (ultima.meta?.has_more ? (ultima.meta.cursor ?? null) : null),
    enabled: tipos === null || tipos.length > 0,
  });

  useRealtimeChannel({
    name: `historico-${alvo.tipo}-${alvo.id}`,
    postgresChanges: {
      event: "INSERT",
      table: "crm_lead_activities",
      filter: `${alvo.tipo === "negocio" ? "lead_id" : "contact_id"}=eq.${alvo.id}`,
    },
    onChange: () => void qc.invalidateQueries({ queryKey: ["timeline", alvo.id] }),
  });

  const itens = useMemo(() => {
    const todos = consulta.data?.pages.flatMap((p) => p.data) ?? [];
    return grupo === "automacoes" ? todos.filter(ehAutomacao) : todos;
  }, [consulta.data, grupo]);

  return {
    itens,
    isLoading: consulta.isLoading,
    isError: consulta.isError,
    temMais: !!consulta.hasNextPage,
    carregarMais: () => void consulta.fetchNextPage(),
    carregandoMais: consulta.isFetchingNextPage,
  };
}

export const useHistoricoDoNegocio = (leadId: string, grupo: ChaveDoGrupo) =>
  useHistorico({ tipo: "negocio", id: leadId }, grupo);
