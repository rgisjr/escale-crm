"use client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { apiClient } from "@/lib/api/client";
import type { AcessoDaVisualizacao, Visualizacao } from "@/lib/escale/visualizacoes/regras";

/**
 * A ESCRITA DAS VISUALIZAÇÕES (fork Escale, Fase 1C) — o desenho de
 * `hooks/escale/useOrigens.ts`: toda mutação RESOLVE a lista relida do banco e a
 * tela aplica isso; o `router.refresh()` fica para a PRÓXIMA navegação.
 */
type RespostaDeVisualizacoes = { data: Visualizacao[] };

const VISUALIZACOES = "/api/v1/pipeline-views";
const daVisualizacao = (id: string) => `${VISUALIZACOES}/${encodeURIComponent(id)}`;

export interface NovaVisualizacao {
  id: string;
  name: string;
  acesso: AcessoDaVisualizacao;
  origens: string[];
  pessoas: string[];
}

export interface MudancaDeVisualizacao {
  name?: string;
  acesso?: AcessoDaVisualizacao;
  origens?: string[];
  pessoas?: string[];
}

function useAoTerminar() {
  const router = useRouter();
  return () => router.refresh();
}

export function useCriarVisualizacao() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async (nova: NovaVisualizacao) =>
      (await apiClient.post<RespostaDeVisualizacoes>(VISUALIZACOES, nova)).data,
    onSettled,
  });
}

export function useAtualizarVisualizacao() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async ({ id, mudanca }: { id: string; mudanca: MudancaDeVisualizacao }) =>
      (await apiClient.patch<RespostaDeVisualizacoes>(daVisualizacao(id), mudanca)).data,
    onSettled,
  });
}

export function useExcluirVisualizacao() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.delete<RespostaDeVisualizacoes>(daVisualizacao(id))).data,
    onSettled,
  });
}
