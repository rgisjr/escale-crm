"use client";
import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { useCallback } from "react";

import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import { apiClient } from "@/lib/api/client";
import type { BoardData } from "@/lib/kanban/types";

/**
 * OS QUADROS DAS ORIGENS DE UMA VISUALIZAÇÃO (fork Escale, Fase 1C).
 *
 * Cada origem é lida pela MESMA rota e com a MESMA chave de cache do funil
 * (`chaveDoQuadro`). É isso que faz a permissão de cada origem valer aqui sem
 * cópia (a rota lê com a sessão de quem olha), e faz o arrasto, as ações do
 * card e o tempo real — que escrevem nessa chave — aparecerem no quadro
 * combinado sem código novo. Origem que a pessoa não pode abrir (403/404) entra
 * em `indisponiveis` e o resto do quadro abre.
 */
async function buscarQuadro(pipelineId: string): Promise<BoardData> {
  const res = await apiClient.get<{ data: BoardData }>(`/api/v1/pipelines/${pipelineId}/board`);
  // O mesmo cuidado do `fetchBoard` do funil: aceita o envelope e o corpo cru.
  return res && typeof res === "object" && "data" in res ? res.data : (res as unknown as BoardData);
}

export interface QuadrosDaVisualizacao {
  quadros: BoardData[];
  carregando: boolean;
  indisponiveis: string[];
}

export function useQuadrosDaVisualizacao(pipelineIds: readonly string[]): QuadrosDaVisualizacao {
  const combine = useCallback(
    (resultados: UseQueryResult<BoardData>[]): QuadrosDaVisualizacao => ({
      quadros: resultados.flatMap((r) => (r.data ? [r.data] : [])),
      carregando: resultados.some((r) => r.isPending),
      indisponiveis: resultados.flatMap((r, i) => (r.isError && !r.data ? [pipelineIds[i]!] : [])),
    }),
    [pipelineIds],
  );
  return useQueries({
    queries: pipelineIds.map((id) => ({ queryKey: chaveDoQuadro(id), queryFn: () => buscarQuadro(id) })),
    combine,
  });
}
