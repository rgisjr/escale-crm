"use client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";

import { parametrosDaConsulta, type ConsultaDaFila } from "./useFilaDeConversas";

/** Quantas conversas o painel alcança (N12: "Selecionar todas as N"; N7: tem grupo?). A chave NÃO começa por "conversations": o tempo real e as ações refaziam este COUNT da organização inteira a cada evento (Q1, B1-19); vale o staleTime, e as ações em massa invalidam "fila-total". */
export function useTotalDaFila(consulta: ConsultaDaFila, ativo: boolean) {
  const qs = parametrosDaConsulta({ ...consulta, ordem: "interacao" }).toString();
  return useQuery({
    queryKey: ["fila-total", qs],
    enabled: ativo,
    staleTime: 30_000,
    queryFn: async () =>
      (
        await apiClient.get<{ data: { total: number } }>(
          `/api/v1/fila-da-casca/total${qs ? `?${qs}` : ""}`,
        )
      ).data.total,
  });
}
