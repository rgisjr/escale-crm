"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import type { FiltroDoPainel, Pergunta } from "@/lib/escale/indicadores/pergunta";
import { comVagaNoNavegador } from "@/lib/escale/indicadores/painel/fila-do-navegador";
import type { Intervalo } from "@/lib/escale/indicadores/painel/preferencias";

const ROTA = "/api/v1/indicadores-da-casca/consultar";
const FRESCOR_MS = 60_000;
const TENTATIVAS_NO_429 = 2;
const MINUTO_MS = 60_000;

export const chaveDoResultado = (graficoId: string, pergunta: unknown, filtro: FiltroDoPainel, rodada: number) =>
  ["resultado-do-grafico", graficoId, pergunta, filtro, rodada] as const;

/** Consulta de um gráfico (Fase 7C): preguiçosa (`ligado`), na fila de 3 da aba, `fresco` do "Atualizar". */
export function useResultadoDoGrafico(a: {
  graficoId: string;
  pergunta: Pergunta | null;
  filtro: FiltroDoPainel;
  ligado: boolean;
  rodada: number;
  intervaloMin: Intervalo;
  limite?: number;
}) {
  return useQuery<Resultado, ApiError>({
    queryKey: chaveDoResultado(a.graficoId, a.pergunta, a.filtro, a.rodada),
    enabled: a.ligado && a.pergunta !== null,
    queryFn: () =>
      comVagaNoNavegador(async () =>
        (
          await apiClient.post<{ data: Resultado }>(ROTA, {
            pergunta: { ...a.pergunta, ...(a.limite ? { limite: a.limite } : {}) },
            filtroDoPainel: a.filtro,
            ...(a.rodada > 0 ? { fresco: true } : {}),
          })
        ).data,
      ),
    staleTime: FRESCOR_MS,
    refetchInterval: a.intervaloMin ? a.intervaloMin * MINUTO_MS : false,
    refetchIntervalInBackground: false,
    // Só a fila cheia (429) tenta de novo; o resto vira o estado de erro do card.
    retry: (tentativas, erro) => erro instanceof ApiError && erro.status === 429 && tentativas < TENTATIVAS_NO_429,
    retryDelay: (tentativa) => 1000 * (tentativa + 1),
    placeholderData: keepPreviousData,
  });
}
