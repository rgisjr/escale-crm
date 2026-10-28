"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import { HEADER_ORG_DA_ABA, orgDaAba } from "@/lib/auth/org-da-aba";
import type { ColunaDaPagina } from "@/lib/escale/indicadores/motor/detalhamento";
import type { Detalhamento, DetalhamentoParaCsv } from "@/lib/escale/indicadores/pergunta";
import { comVagaNoNavegador } from "@/lib/escale/indicadores/painel/fila-do-navegador";

const ROTA = "/api/v1/indicadores-da-casca/detalhar";
const FRESCOR_MS = 60_000;
const TENTATIVAS_NO_429 = 2;

export type RespostaDoDetalhamento = {
  colunas: ColunaDaPagina[];
  linhas: Record<string, unknown>[];
  total: number;
  teto: boolean;
  pagina: number;
  porPagina: number;
  fuso: string;
};

/** Uma página do detalhamento (fork Escale, Fase 7E): trocar de página não pisca, 429 tenta de novo. */
export function useDetalhamento(a: { graficoId: string; pedido: Detalhamento | null; ligado: boolean }) {
  return useQuery<RespostaDoDetalhamento, ApiError>({
    queryKey: ["detalhamento", a.graficoId, a.pedido] as const,
    enabled: a.ligado && a.pedido !== null,
    queryFn: () =>
      comVagaNoNavegador(async () => (await apiClient.post<{ data: RespostaDoDetalhamento }>(ROTA, a.pedido)).data),
    staleTime: FRESCOR_MS,
    retry: (tentativas, erro) => erro instanceof ApiError && erro.status === 429 && tentativas < TENTATIVAS_NO_429,
    retryDelay: (tentativa) => 1000 * (tentativa + 1),
    placeholderData: keepPreviousData,
  });
}

/** Pede o CSV na hora e devolve o texto; `truncado` vem do cabeçalho `x-escale-truncado`. */
export async function pedirCsvDoDetalhamento(pedido: DetalhamentoParaCsv): Promise<{ texto: string; truncado: boolean }> {
  const aba = orgDaAba();
  const resposta = await fetch(`${ROTA}/csv`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(aba?.orgId ? { [HEADER_ORG_DA_ABA]: aba.orgId } : {}) },
    body: JSON.stringify(pedido),
  });
  if (!resposta.ok) throw new Error(`detalhamento_csv_${resposta.status}`);
  return { texto: await resposta.text(), truncado: resposta.headers.get("x-escale-truncado") === "1" };
}
