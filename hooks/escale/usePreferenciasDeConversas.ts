"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { lerCamposDoCartao } from "@/lib/escale/conversas/campos-do-cartao";
import {
  PREFERENCIAS_PADRAO,
  type Gravacao,
  type Preferencias,
} from "@/lib/escale/conversas/preferencias";
import { lerSecoes } from "@/lib/escale/conversas/secoes";
import { lerVisualizacao } from "@/lib/escale/conversas/visualizacao";

const ROTA = "/api/v1/preferencias-de-conversas";
export const CHAVE_DAS_PREFERENCIAS = ["preferencias-de-conversas"] as const;

export function usePreferenciasDeConversas() {
  const q = useQuery({
    queryKey: CHAVE_DAS_PREFERENCIAS,
    queryFn: async () =>
      (await apiClient.get<{ data: { preferencias: Preferencias } }>(ROTA)).data.preferencias,
    staleTime: 5 * 60_000,
  });
  return { ...q, data: q.data ?? PREFERENCIAS_PADRAO };
}

/** Aplica a chave gravada no cache sem esperar a volta (a tela responde na hora). */
export function aplicarGravacao(atual: Preferencias, g: Gravacao): Preferencias {
  if (g.chave === "visualizacao") return { ...atual, visualizacao: lerVisualizacao(g.valor) };
  if (g.chave === "campos_do_negocio")
    return { ...atual, campos_do_negocio: lerCamposDoCartao(g.valor) };
  return { ...atual, secoes: lerSecoes({ ...atual.secoes, ...g.valor }) };
}

export function useGravarPreferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (g: Gravacao) => apiClient.put<{ data: { preferencias: Preferencias } }>(ROTA, g),
    onMutate: async (g) => {
      await qc.cancelQueries({ queryKey: CHAVE_DAS_PREFERENCIAS });
      const antes = qc.getQueryData<Preferencias>(CHAVE_DAS_PREFERENCIAS) ?? PREFERENCIAS_PADRAO;
      qc.setQueryData(CHAVE_DAS_PREFERENCIAS, aplicarGravacao(antes, g));
      return { antes };
    },
    onError: (_e, _g, ctx) => {
      if (ctx) qc.setQueryData(CHAVE_DAS_PREFERENCIAS, ctx.antes);
    },
    onSuccess: (resposta) => {
      if (resposta?.data?.preferencias?.secoes)
        qc.setQueryData(CHAVE_DAS_PREFERENCIAS, resposta.data.preferencias);
    },
  });
}
