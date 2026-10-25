"use client";
import { useQuery, type QueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";

import { parametrosDaConsulta, type ConsultaDaFila } from "./useFilaDeConversas";

/**
 * Marca o total como velho sem refazer a contagem agora: o fechar, transferir, assumir e soltar
 * da pessoa mudam o que o painel alcança, mas refazer o COUNT da organização a cada ação é o
 * que a Q1 (B1-19) tirou do tempo real. Refaz quando o total volta a ser lido.
 */
export function invalidarTotalDaFila(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: ["fila-total"], refetchType: "none" });
}

/** Quantas conversas o painel alcança (N12: "Selecionar todas as N"; o "tem grupo?" é do `useTemGruposNaFila`, Q7c). A chave NÃO começa por "conversations": o tempo real e as ações refaziam este COUNT da organização inteira a cada evento (Q1, B1-19); vale o staleTime, e as ações em massa invalidam "fila-total". */
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
