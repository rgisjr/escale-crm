"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import { chaveDoFunil } from "@/hooks/pipelines/useAgentMapping";
import { apiClient } from "@/lib/api/client";
import type { PedidoDeGravarEtapas } from "@/lib/escale/etapas/rascunho";
import type { ModeloDaEtapa } from "@/lib/escale/playbook/regras";

import { chaveDasConfiguracoes } from "./useConfiguracoesDaOrigem";
import { chaveDoPlaybook } from "./usePlaybookDaOrigem";

/**
 * O "Salvar na origem" da aba Etapas e atividades (fork Escale, Fase 1L): etapas e
 * playbook numa chamada só, na ordem que a rota garante. Com sucesso OU erro, relê
 * tudo: as operações não são uma transação, e a tela precisa mostrar o que o banco tem.
 */
export type CorpoDasEtapas = PedidoDeGravarEtapas & { atividades: ModeloDaEtapa[] };

export function useGravarEtapas(id: string) {
  const qc = useQueryClient();
  const reler = () => {
    void qc.invalidateQueries({ queryKey: chaveDasConfiguracoes(id) });
    void qc.invalidateQueries({ queryKey: chaveDoPlaybook(id) });
    void qc.invalidateQueries({ queryKey: chaveDoQuadro(id) });
    void qc.invalidateQueries({ queryKey: chaveDoFunil(id) });
    void qc.invalidateQueries({ queryKey: ["atividades-do-negocio"] });
  };
  return useMutation({
    mutationFn: async (corpo: CorpoDasEtapas) =>
      (
        await apiClient.put<{ data: { ids: Record<string, string> } }>(
          `/api/v1/pipelines/${id}/etapas-e-atividades`,
          corpo,
        )
      ).data,
    onSettled: reler,
  });
}
