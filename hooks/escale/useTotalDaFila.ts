"use client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";

import { parametrosDaConsulta, type ConsultaDaFila } from "./useFilaDeConversas";

/** Quantas conversas o painel alcança (N12: "Selecionar todas as N"; N7: tem grupo?). A chave começa por "conversations": o tempo real a atualiza. */
export function useTotalDaFila(consulta: ConsultaDaFila, ativo: boolean) {
  const qs = parametrosDaConsulta({ ...consulta, ordem: "interacao" }).toString();
  return useQuery({
    queryKey: ["conversations", "total-da-casca", qs],
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
