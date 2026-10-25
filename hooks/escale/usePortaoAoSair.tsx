"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, type ReactNode } from "react";

import { JanelaDeCamposPendentes } from "@/components/escale/configuracoes/JanelaDeCamposPendentes";
import type { RecusaDeCampos } from "@/hooks/kanban/useMoveCard";
import { useEditLead } from "@/hooks/kanban/useUpdateLead";
import { faltandoAoEncerrar } from "@/lib/escale/configuracoes/ao-sair";
import type { CampoFaltando } from "@/lib/leads/campos-exigidos";
import type { Lead } from "@/lib/types/leads";
import { quadroEmCache } from "@/lib/kanban/quadro-em-cache";

export type Encerramento = "won" | "lost";

interface Pendencia {
  faltando: CampoFaltando[];
  continuar: () => void;
}

/**
 * O PORTÃO DO "AO SAIR" NO ⋮ DO CARD (fork Escale, Fase 1F, pergunta 7 do PRD).
 *
 * Ganhar, perder e levar para outro funil são AVANÇO: antes de seguir, o
 * portão confere o "ao sair" da etapa atual e o "ao ganhar/ao perder" do
 * original. Faltando algo, abre o modal "Campos obrigatórios pendentes" da
 * Clint. "Salvar e alterar status" grava os campos no negócio (`PATCH`, que
 * funde `custom_fields`) e só então segue com a ação. O motivo do ganho fica
 * com o fluxo de ganhar do original.
 *
 * Só vale com a casca (F8): com `ativo: false`, `antes` segue direto.
 * `janela` precisa ser desenhada DENTRO da barreira de clique do card
 * (`KanbanCardActions`), como os outros diálogos de lá.
 */
export function usePortaoAoSair(
  pipelineId: string,
  lead: Lead,
  { ativo }: { ativo: boolean },
): {
  antes: (desfecho: Encerramento, continuar: () => void) => void;
  janela: ReactNode;
} {
  const qc = useQueryClient();
  const editar = useEditLead(pipelineId);
  const [pendencia, setPendencia] = useState<Pendencia | null>(null);

  const antes = useCallback(
    (desfecho: Encerramento, continuar: () => void) => {
      if (!ativo) {
        continuar();
        return;
      }
      const quadro = quadroEmCache(qc, pipelineId);
      const atual = quadro?.leads.find((l) => l.id === lead.id) ?? lead;
      const faltando = quadro
        ? faltandoAoEncerrar({
            settings: quadro.pipeline.settings ?? null,
            stages: quadro.stages,
            lead: atual,
            desfecho,
          })
        : [];
      if (faltando.length === 0) {
        continuar();
        return;
      }
      setPendencia({ faltando, continuar });
    },
    [ativo, qc, pipelineId, lead],
  );

  // O modal fala a língua do move (`args`); aqui ele só coleta.
  const recusa: RecusaDeCampos | null = pendencia
    ? {
        args: {
          leadId: lead.id,
          stageId: lead.stage_id,
          positionInStage: lead.position_in_stage,
          expectedUpdatedAt: lead.updated_at,
        },
        faltando: pendencia.faltando,
      }
    : null;

  const janela = (
    <JanelaDeCamposPendentes
      aberta={pendencia !== null}
      onFechar={() => setPendencia(null)}
      recusa={recusa}
      modo="status"
      ocupado={editar.isPending}
      onConfirmar={({ customFields }) => {
        if (!pendencia) return;
        const { continuar } = pendencia;
        editar.mutate(
          { leadId: lead.id, patch: { custom_fields: customFields } },
          {
            onSuccess: () => {
              setPendencia(null);
              continuar();
            },
          },
        );
      }}
    />
  );

  return { antes, janela };
}
