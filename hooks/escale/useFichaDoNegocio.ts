"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { chaveDoNegocioLeve, chaveDoQuadro, useBoard } from "@/hooks/kanban/useBoard";
import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import { moedaDaOrigem } from "@/lib/escale/configuracoes/tipos";
import { recortarQuadro } from "@/lib/escale/filtros/aplicar";
import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import { comparadorDaOrdem } from "@/lib/escale/filtros/ordenar";
import { filtrosDaUrl } from "@/lib/escale/filtros/url";
import type { BoardData, Pipeline, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

/**
 * O NEGÓCIO DA FICHA (fork Escale, Fase 1G).
 *
 * Lê do MESMO cache do quadro (`["board", origemId]`): o tempo real, ganhar,
 * perder, editar, mover e excluir (que gravam nesse cache) e os motivos de
 * perda da origem funcionam aqui sem rota nova. O recorte e a ordem são os do
 * quadro, a partir dos filtros que vieram na URL (C8: "leva em consideração a
 * ordem e os filtros atuais da listagem de negócios").
 *
 * G2-9 (ficha por link, cache do quadro frio): em vez de baixar o funil inteiro
 * antes de pintar, a ficha pinta com `GET /api/v1/leads/:id/ficha` (o negócio e as
 * etapas) e o quadro vem em segundo plano logo depois. Quando ele chega a ficha passa
 * a ler dele e fica igual à de sempre. Até lá não há "próximo negócio" (`leadsDoRecorte`
 * é `null`) e a checagem de duplicidade do "Novo negócio" vê só este negócio; o
 * `POST /leads` confere no banco de qualquer jeito.
 */
type Busca = Parameters<typeof filtrosDaUrl>[0];

export interface FichaCarregada {
  estado: "pronto";
  lead: Lead;
  pipeline: Pipeline;
  stages: Stage[];
  /**
   * Os negócios do quadro depois dos filtros da URL (o próximo negócio anda neles).
   * `null` enquanto o quadro ainda não chegou (ficha aberta por link).
   */
  leadsDoRecorte: Lead[] | null;
  /** Todos os negócios do funil, sem filtro (a checagem de duplicidade do "Novo negócio"). */
  leadsDoQuadro: Lead[];
  ordem: ((a: Lead, b: Lead) => number) | undefined;
  atualizar: () => void;
}

export type Ficha =
  { estado: "carregando" } | { estado: "erro" } | { estado: "sumiu" } | FichaCarregada;

async function buscarNegocioLeve(negocioId: string): Promise<BoardData> {
  const res = await apiClient.get<{ data: BoardData }>(`/api/v1/leads/${negocioId}/ficha`);
  return "data" in res ? res.data : (res as unknown as BoardData);
}

export function useFichaDoNegocio(negocioId: string, origemId: string, busca: Busca): Ficha {
  const qc = useQueryClient();
  // Quadro já em cache (veio do clique) = caminho de sempre, zero requisição a mais. Frio
  // (link direto): a rota leve pinta a ficha e, só depois dela, o quadro é pedido por um
  // observador de verdade (`useBoard`), então cancelamento, falha e invalidação se resolvem
  // sozinhos. Quando o quadro tem dados, a ficha passa a ler dele.
  const quadroEmMemoria = qc.getQueryData(chaveDoQuadro(origemId)) !== undefined;
  const leveEmMemoria = qc.getQueryData(chaveDoNegocioLeve(origemId, negocioId)) !== undefined;
  const quadro = useBoard(quadroEmMemoria || leveEmMemoria ? origemId : null);
  const comQuadro = quadro.data !== undefined;
  const leve = useQuery({
    queryKey: chaveDoNegocioLeve(origemId, negocioId),
    queryFn: () => buscarNegocioLeve(negocioId),
    enabled: !comQuadro,
  });
  const fonte = comQuadro ? quadro : leve;
  const { data, isLoading } = fonte;
  const error = fonte.error;
  const refetch = fonte.refetch;

  // Tempo real do PRÓPRIO negócio enquanto o canal do quadro não existe (o do quadro assume depois).
  const aoMudar = useCallback(() => {
    void qc.invalidateQueries({ queryKey: chaveDoNegocioLeve(origemId, negocioId) });
  }, [qc, origemId, negocioId]);
  useRealtimeChannel({
    name: `ficha-${negocioId}`,
    postgresChanges: comQuadro
      ? undefined
      : { event: "*", schema: "public", table: "crm_leads", filter: `id=eq.${negocioId}` },
    onChange: aoMudar,
    enabled: !comQuadro,
  });

  const org = useActiveOrg();
  const filtros = useMemo(() => filtrosDaUrl(busca).filtros, [busca]);
  const campos = useMemo(
    () => camposFiltraveis([data?.pipeline.settings]),
    [data?.pipeline.settings],
  );
  return useMemo((): Ficha => {
    // Um refetch que falha com o quadro em cache não apaga a ficha.
    if (error && !data) {
      // A rota leve responde 404 para o que o quadro esconde (arquivado, contato pessoal).
      return { estado: error instanceof ApiError && error.status === 404 ? "sumiu" : "erro" };
    }
    if (isLoading || !data) return { estado: "carregando" };
    const lead = data.leads.find((l) => l.id === negocioId);
    if (!lead) return { estado: "sumiu" };
    // Mesma moeda do recorte do quadro (`app/app/pipelines/[id]/_client.tsx`).
    const recorte = comQuadro
      ? recortarQuadro(data, filtros, {
          moeda: moedaDaOrigem(data.pipeline.settings) ?? org?.currency ?? null,
          campos,
        })
      : null;
    return {
      estado: "pronto",
      lead,
      pipeline: data.pipeline,
      stages: data.stages,
      leadsDoRecorte: recorte ? recorte.leads : null,
      leadsDoQuadro: data.leads,
      ordem: comparadorDaOrdem(filtros.ordem, campos),
      atualizar: () => void refetch(),
    };
  }, [error, isLoading, data, comQuadro, negocioId, filtros, org?.currency, campos, refetch]);
}
