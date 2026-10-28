"use client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/types";
import type { OpcaoDoFiltro } from "@/lib/escale/indicadores/editor/opcoes-fixas";

const FRESCOR_MS = 300_000;

/** As opções do seletor múltiplo do filtro do editor (7D). Só consulta com o seletor aberto (`ligado`). */
export function useOpcoesDaDimensao(dimensaoId: string | null, ligado: boolean) {
  return useQuery<OpcaoDoFiltro[], ApiError>({
    queryKey: ["opcoes-da-dimensao", dimensaoId],
    enabled: ligado && dimensaoId !== null,
    queryFn: async () =>
      (
        await apiClient.get<{ data: { opcoes: OpcaoDoFiltro[] } }>(
          `/api/v1/indicadores-da-casca/opcoes?dimensao=${encodeURIComponent(dimensaoId ?? "")}`,
        )
      ).data.opcoes,
    staleTime: FRESCOR_MS,
  });
}
