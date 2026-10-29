"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchComTempoMaximo } from "@/lib/escale/fetch-com-tempo-maximo";
import type { ModeloDaConta } from "@/lib/escale/conversas/modelos";
import type { MapeamentoDoModelo } from "@/lib/variaveis/mapeamento";

const ROTA = "/api/v1/channels/templates";
export const CHAVE_DOS_MODELOS_DA_CONTA = ["modelos-da-conta"] as const;

// Tempo máximo (Frente F, 29/10/2026): ver lib/escale/fetch-com-tempo-maximo.ts.
async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetchComTempoMaximo(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const corpo = await r.json().catch(() => null);
  if (!r.ok) {
    const erro = new Error(corpo?.error?.message ?? "Erro ao salvar as variáveis.") as Error & {
      detalhes?: unknown;
    };
    erro.detalhes = corpo?.error?.details;
    throw erro;
  }
  return corpo.data as T;
}

/**
 * Os modelos da conta oficial, com o mapeamento das variáveis (fork Escale,
 * Frente V): a lista de Conversas › Configurações › Modelos de mensagem.
 * Todos os status (a conversa mostra só os aprovados).
 */
export function useModelosDaConta(ativo = true) {
  return useQuery({
    queryKey: CHAVE_DOS_MODELOS_DA_CONTA,
    enabled: ativo,
    queryFn: () => pedir<{ waba: string | null; templates: ModeloDaConta[] }>(ROTA),
    staleTime: 60_000,
  });
}

export function useSalvarVariaveisDoModelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { name: string; language: string; variaveis: MapeamentoDoModelo }) =>
      pedir<{ variaveis: MapeamentoDoModelo }>(`${ROTA}/variaveis`, { method: "PATCH", body: JSON.stringify(p) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CHAVE_DOS_MODELOS_DA_CONTA });
      void qc.invalidateQueries({ queryKey: ["modelos-de-mensagem"] });
    },
  });
}

export function useRessincronizarModelos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => pedir<unknown>(ROTA, { method: "POST", body: "{}" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CHAVE_DOS_MODELOS_DA_CONTA });
      void qc.invalidateQueries({ queryKey: ["modelos-de-mensagem"] });
    },
  });
}
