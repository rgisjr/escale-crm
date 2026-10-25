"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { usePermission, useUser } from "@/hooks/auth/AuthProvider";
import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import { useEditLead } from "@/hooks/kanban/useUpdateLead";
import { apiClient } from "@/lib/api/client";
import type {
  AtividadeDoNegocio,
  AtividadesDoNegocio,
  NovaAtividadeDoNegocio,
} from "@/lib/escale/negocio/atividades";
import { proximoEstadoAoAlternar, type EdicaoDaTarefa } from "@/lib/tarefas/tipos";
import type { Lead } from "@/lib/types/leads";

/**
 * AS ATIVIDADES DO NEGÓCIO (fork Escale, Fase 1I; C19–C21).
 *
 * Lê a rota do fork (tarefas + tipo + playbook) e muda pelas rotas que já
 * existem: `PATCH/DELETE /api/v1/tasks/[id]` (que gravam `task_completed` na
 * linha do tempo e o gatilho da 9009 grava quem concluiu). Toda mudança
 * invalida também as tarefas do original e o quadro (o selo do card).
 *
 * C21, como na Clint (o `completeActivity` dela faz isso na tela): concluir
 * num negócio sem dono — nem pessoa nem agente de IA — faz quem concluiu virar
 * o dono, pelo MESMO `PATCH /api/v1/leads/[id]` do "Alterar usuário", com a
 * mesma permissão (`pipeline.move_card`).
 */
export const chaveDasAtividades = (leadId: string) => ["atividades-do-negocio", leadId] as const;

export function useAtividadesDoNegocio(lead: Lead) {
  const qc = useQueryClient();
  const user = useUser();
  const podeAssumir = usePermission("pipeline.move_card");
  const editarLead = useEditLead(lead.pipeline_id);
  const chave = chaveDasAtividades(lead.id);

  const consulta = useQuery({
    // A etapa entra na chave: o gatilho do banco cria as tarefas ao mudar de etapa, por qualquer caminho.
    queryKey: [...chave, lead.stage_id],
    queryFn: async () =>
      (await apiClient.get<{ data: AtividadesDoNegocio }>(`/api/v1/leads/${lead.id}/atividades`))
        .data,
    staleTime: 10_000,
  });

  // Q2a (B2-3, G2-1): só o quadro DESTE funil e sem esperar nenhum refetch (o `mutateAsync`
  // não pode ficar parado no GET pesado do quadro). `selo` = o selo do card pode ter mudado.
  const invalidar = (selo = true) => {
    void qc.invalidateQueries({ queryKey: chave });
    void qc.invalidateQueries({ queryKey: ["crm_tasks"] });
    if (selo) void qc.invalidateQueries({ queryKey: chaveDoQuadro(lead.pipeline_id) });
  };

  const editar = useMutation({
    mutationFn: ({ id, entrada }: { id: string; entrada: EdicaoDaTarefa }) =>
      apiClient.patch(`/api/v1/tasks/${id}`, entrada),
    // Só o conteúdo (o autosave do detalhe) não mexe no selo do card.
    onSuccess: (_dados, { entrada }) =>
      invalidar(Object.keys(entrada).some((k) => k !== "description")),
  });
  // Q2a (B2-4): as gravações vão uma de cada vez, na ordem; um PATCH lento não volta o texto velho.
  const fila = useRef<Promise<unknown>>(Promise.resolve());
  const editarEmFila = (id: string, entrada: EdicaoDaTarefa) => {
    const vez = fila.current.then(() => editar.mutateAsync({ id, entrada }));
    fila.current = vez.catch(() => undefined);
    return vez;
  };
  const excluir = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/tasks/${id}`),
    onSuccess: () => invalidar(),
  });
  const criar = useMutation({
    mutationFn: (nova: NovaAtividadeDoNegocio) =>
      apiClient.post(`/api/v1/leads/${lead.id}/atividades`, nova),
    onSuccess: () => invalidar(),
  });

  async function alternar(
    a: Pick<AtividadeDoNegocio, "id" | "status">,
  ): Promise<"concluida" | "reaberta"> {
    const proximo = proximoEstadoAoAlternar(a.status);
    await editarEmFila(a.id, { status: proximo });
    if (proximo !== "done") return "reaberta";
    if (!lead.owner_user_id && !lead.owner_agent_id && podeAssumir) {
      // A tarefa já está concluída: se o dono falhar, o `useEditLead` já avisou e a conclusão vale.
      await editarLead
        .mutateAsync({ leadId: lead.id, patch: { owner_user_id: user.id } })
        .catch(() => undefined);
    }
    return "concluida";
  }

  return {
    dados: consulta.data ?? null,
    carregando: consulta.isLoading,
    falhou: consulta.isError,
    recarregar: () => void consulta.refetch(),
    alternar,
    editar: editarEmFila,
    excluir: (id: string) => excluir.mutateAsync(id),
    criar: (nova: NovaAtividadeDoNegocio) => criar.mutateAsync(nova),
  };
}
