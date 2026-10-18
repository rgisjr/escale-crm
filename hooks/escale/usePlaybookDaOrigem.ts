"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { ModeloDaEtapa } from "@/lib/escale/playbook/regras";

/**
 * O PLAYBOOK DA ORIGEM (fork Escale, Fase 1I): a lista que a aba Etapas e
 * atividades edita. Sempre relê ao abrir (tela de gestor). Salvar põe a lista
 * relida no cache e invalida as atividades das fichas abertas (a etapa futura
 * mostra o playbook).
 */
type Resposta = { data: { atividades: ModeloDaEtapa[] } };

const rota = (id: string) => `/api/v1/pipelines/${id}/playbook`;

export const chaveDoPlaybook = (id: string) => ["playbook-da-origem", id] as const;

export function usePlaybookDaOrigem(id: string) {
  return useQuery({
    queryKey: chaveDoPlaybook(id),
    queryFn: async () => (await apiClient.get<Resposta>(rota(id))).data?.atividades ?? [],
    staleTime: 0,
  });
}

export function useSalvarPlaybook(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (atividades: ModeloDaEtapa[]) =>
      (await apiClient.put<Resposta>(rota(id), { atividades })).data.atividades,
    onSuccess: (lista) => {
      qc.setQueryData(chaveDoPlaybook(id), lista);
      void qc.invalidateQueries({ queryKey: ["atividades-do-negocio"] });
    },
  });
}
