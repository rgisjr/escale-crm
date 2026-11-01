"use client";
import { createContext, useContext, type ReactNode } from "react";

import type { FiltroDasExecucoes, ReferenciaDeAcao, ResumoDaAutomacao } from "@/lib/escale/automacoes/insights/tipos";

/**
 * O CONTEXTO DOS INSIGHTS NO NÓ (fork Escale, Fase 5C): quando o `NoDoFluxo` está dentro dele, desenha o
 * "Overview de resultados" e esconde a barra de hover; fora dele (o editor da 5B), nada muda.
 */
export interface InsightsDoNo {
  resumo: ResumoDaAutomacao | null;
  carregando: boolean;
  erro: boolean;
  /** As ações da fila do motor que cada caixa da tela cobre (um passo "Ações" cobre várias). */
  acoesDosPassos: ReadonlyMap<string, ReferenciaDeAcao[]>;
  aoAbrir: (filtro: FiltroDasExecucoes) => void;
}

const Contexto = createContext<InsightsDoNo | null>(null);

export function InsightsDoNoProvider({ valor, children }: { valor: InsightsDoNo; children: ReactNode }) {
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** `null` fora dos Insights. */
export function useInsightsDoNo(): InsightsDoNo | null {
  return useContext(Contexto);
}
