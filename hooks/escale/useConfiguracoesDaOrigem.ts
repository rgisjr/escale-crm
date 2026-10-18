"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import { apiClient } from "@/lib/api/client";
import type { PatchDasConfiguracoes } from "@/lib/escale/configuracoes/gravar";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";

type Resposta = { data: ConfiguracoesDaOrigem };

const rota = (id: string) => `/api/v1/pipelines/${id}/configuracoes`;

export const chaveDasConfiguracoes = (id: string) => ["configuracoes-da-origem", id] as const;

/** A origem como a tela de configurações a vê. Sempre relê ao abrir: é tela de gestor. */
export function useConfiguracoesDaOrigem(id: string) {
  return useQuery({
    queryKey: chaveDasConfiguracoes(id),
    queryFn: async () => (await apiClient.get<Resposta>(rota(id))).data,
    staleTime: 0,
  });
}

/**
 * Salvar UMA seção. A resposta é a origem relida do banco e vai direto para o
 * cache da tela. O quadro dessa origem é invalidado: ele lê moeda, motivos
 * ativos, "ao sair" e alerta do `settings` que carregou.
 */
export function useSalvarConfiguracoes(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: PatchDasConfiguracoes) =>
      (await apiClient.patch<Resposta>(rota(id), patch)).data,
    onSuccess: (config) => {
      qc.setQueryData(chaveDasConfiguracoes(id), config);
      void qc.invalidateQueries({ queryKey: chaveDoQuadro(id) });
      // Quem se pôs na lista de avisos passa a ser avisado sem recarregar (Fase 1K, D15).
      void qc.invalidateQueries({ queryKey: ["escale", "avisos-da-origem"] });
    },
  });
}
