"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import { useMoveCard, type RecusaDeCampos } from "@/hooks/kanban/useMoveCard";
import { faltandoAoMover } from "@/lib/escale/configuracoes/ao-sair";
import type { BoardData } from "@/lib/kanban/types";

type OpcoesDoMove = NonNullable<Parameters<typeof useMoveCard>[1]>;
type ArgsDoMove = RecusaDeCampos["args"];

/**
 * O ARRASTO COM OS CAMPOS DA ETAPA (fork Escale, Fase 1F, pergunta 7 do PRD).
 *
 * É o `useMoveCard` do original, com uma conferência ANTES de ir ao servidor:
 * o "ao sair" da etapa atual (só quando o card avança) e o que o servidor vai
 * cobrar no destino. Faltando algo, o hook chama `onCamposFaltando`, o MESMO
 * caminho da recusa 422 do servidor, e quem chama abre o modal de campos
 * pendentes. O reenvio com os valores passa, porque agora eles estão lá.
 *
 * O "ao sair" é só da tela por decisão (lote, automação, agente e API passam
 * livres), por isso mora aqui e não no servidor. O quadro é lido do cache sem
 * filtro (`chaveDoQuadro`), o mesmo de onde o arrasto já tira as posições. Sem
 * cache, ou sem `onCamposFaltando`, o move vai direto, como antes.
 * Só confere com a casca (F8): o `KanbanBoard` passa `conferir: aparencia === "casca"`.
 */
export function useMoverComCamposDaEtapa(
  pipelineId: string,
  opcoes: OpcoesDoMove = {},
  { conferir }: { conferir: boolean } = { conferir: true },
) {
  const qc = useQueryClient();
  const mover = useMoveCard(pipelineId, opcoes);
  const moverNoServidor = mover.mutate;
  // Quem chama pode recriar `opcoes` a cada render (o motor da Visualização faz
  // isso); o `mutate` daqui precisa continuar estável para quem o guarda.
  const aoFaltar = useRef(opcoes.onCamposFaltando);
  useEffect(() => {
    aoFaltar.current = opcoes.onCamposFaltando;
  });

  const mutate = useCallback(
    (args: ArgsDoMove) => {
      const quadro = qc.getQueryData<BoardData>(chaveDoQuadro(pipelineId));
      const lead = quadro?.leads.find((l) => l.id === args.leadId);
      const avisar = aoFaltar.current;
      if (conferir && quadro && lead && avisar) {
        const faltando = faltandoAoMover({
          quadro,
          lead,
          paraStageId: args.stageId,
          customFieldsPropostos: args.customFields ?? null,
          motivoDeGanho: args.wonReason ?? null,
        });
        if (faltando.length > 0) {
          avisar({ args, faltando });
          return;
        }
      }
      moverNoServidor(args);
    },
    [qc, pipelineId, moverNoServidor, conferir],
  );

  return { ...mover, mutate };
}
