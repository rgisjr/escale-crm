"use client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { apiClient } from "@/lib/api/client";
import type { Origens } from "@/lib/escale/origens/regras";

/**
 * A ESCRITA DO PAINEL ORIGENS (fork Escale, Fase 1A).
 *
 * As quatro rotas releem grupos e funis do banco antes de responder, e a tela
 * APLICA O CORPO — o desenho de `hooks/pipelines/usePipelines.ts`, pelo motivo
 * medido lá: depender do `router.refresh()` para mostrar o efeito da própria
 * ação é corrida contra os prefetches. O refresh continua, para a PRÓXIMA
 * navegação encontrar o servidor em dia.
 */
export type RespostaDeOrigens = { data: Origens };

const GRUPOS = "/api/v1/pipeline-groups";
const doGrupo = (id: string) => `${GRUPOS}/${encodeURIComponent(id)}`;
const grupoDoFunil = (id: string) => `/api/v1/pipelines/${encodeURIComponent(id)}/grupo`;

function useReler() {
  const router = useRouter();
  return () => router.refresh();
}

export function useCriarGrupo() {
  const reler = useReler();
  return useMutation({
    mutationFn: (name: string) => apiClient.post<RespostaDeOrigens>(GRUPOS, { name }),
    onSettled: reler,
  });
}

export function useRenomearGrupo() {
  const reler = useReler();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiClient.patch<RespostaDeOrigens>(doGrupo(id), { name }),
    onSettled: reler,
  });
}

export function useExcluirGrupo() {
  const reler = useReler();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<RespostaDeOrigens>(doGrupo(id)),
    onSettled: reler,
  });
}

export function useMoverFunil() {
  const reler = useReler();
  return useMutation({
    mutationFn: ({ funilId, groupId }: { funilId: string; groupId: string | null }) =>
      apiClient.put<RespostaDeOrigens>(grupoDoFunil(funilId), { group_id: groupId }),
    onSettled: reler,
  });
}
