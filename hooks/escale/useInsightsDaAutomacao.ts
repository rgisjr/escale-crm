"use client";
import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";

import { explicacaoDe } from "@/app/app/webhooks/_components/ActivityTab";
import { apiClient } from "@/lib/api/client";
import { csvDasExecucoes, nomeDoCsvDasExecucoes } from "@/lib/escale/automacoes/insights/csv";
import type {
  FiltroDasExecucoes,
  LinhaDaExecucao,
  PeriodoDosInsights,
  ResumoDaAutomacao,
} from "@/lib/escale/automacoes/insights/tipos";
import { baixarCsv } from "@/lib/escale/exportar/baixar";

/**
 * OS DADOS DA ABA INSIGHTS (fork Escale, Fase 5C). A chave leva o prefixo do original
 * (`["automation-rule-runs", …]`): o "Reenviar" (`useResendAutomationRun`) invalida
 * `["automation-rule-runs"]` e, pelo casamento por prefixo, o painel e a listagem recarregam.
 * Lidos uma vez por abertura e por troca de período (I15): sem consulta repetida no relógio.
 */
export const CHAVE_DOS_INSIGHTS = ["automation-rule-runs", "insights"] as const;
const BASE = "/api/v1/automacoes-da-casca";
const STALE_MS = 30_000;

export function useResumoDaAutomacao(id: string | null, periodo: PeriodoDosInsights): UseQueryResult<ResumoDaAutomacao> {
  return useQuery({
    queryKey: [...CHAVE_DOS_INSIGHTS, "resumo", id, periodo],
    queryFn: async () => (await apiClient.get<{ data: ResumoDaAutomacao }>(`${BASE}/${id}/insights?periodo=${periodo}`)).data,
    enabled: id !== null,
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
  });
}

/**
 * A query da listagem e do CSV: painel → `situacoes`; passo → `passos` (`indice:tipo`) e
 * `resultados`; condições → só período e busca. `selecionados` são as opções marcadas no "Eventos".
 */
export function queryDasExecucoes(
  periodo: PeriodoDosInsights,
  filtro: FiltroDasExecucoes,
  selecionados: readonly string[],
  busca: string,
  pagina?: number,
): string {
  const q = new URLSearchParams({ periodo });
  if (filtro.origem === "painel") q.set("situacoes", selecionados.join(","));
  if (filtro.origem === "passo") {
    q.set("passos", filtro.acoes.map((a) => `${a.indice}:${a.tipo}`).join(","));
    q.set("resultados", selecionados.join(","));
  }
  if (busca.trim()) q.set("busca", busca.trim());
  if (pagina !== undefined) q.set("pagina", String(pagina));
  return q.toString();
}

export function useExecucoesDaAutomacao(
  id: string,
  periodo: PeriodoDosInsights,
  filtro: FiltroDasExecucoes,
  selecionados: readonly string[],
  busca: string,
  pagina: number,
): UseQueryResult<{ total: number; linhas: LinhaDaExecucao[] }> {
  return useQuery({
    queryKey: [...CHAVE_DOS_INSIGHTS, "execucoes", id, periodo, filtro, selecionados, busca, pagina],
    queryFn: async () =>
      (
        await apiClient.get<{ data: { total: number; linhas: LinhaDaExecucao[] } }>(
          `${BASE}/${id}/execucoes?${queryDasExecucoes(periodo, filtro, selecionados, busca, pagina)}`,
        )
      ).data,
    placeholderData: keepPreviousData,
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
  });
}

/**
 * "Exportar CSV": pede as linhas (até 5.000; acima disso a rota responde 422 e o erro sobe com a
 * mensagem dela), monta o CSV aqui, porque a frase do motivo (`explicacaoDe`) é do cliente, e baixa.
 */
export async function exportarExecucoesEmCsv(
  id: string,
  query: string,
  fuso: string,
  t: (texto: string) => string,
): Promise<void> {
  const { data } = await apiClient.get<{ data: { linhas: LinhaDaExecucao[]; acoes: { type: string }[]; nome: string } }>(
    `${BASE}/${id}/execucoes/exportar?${query}`,
  );
  const csv = csvDasExecucoes(data.linhas, data.acoes, t, fuso, (r) => explicacaoDe(r, t));
  baixarCsv(nomeDoCsvDasExecucoes(data.nome, new Date(), fuso), csv);
}
