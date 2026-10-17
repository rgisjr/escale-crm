"use client";
import { useEffect } from "react";

import { useBoard } from "@/hooks/kanban/useBoard";
import type { RecusaDeCampos, RetomadaPendente } from "@/hooks/kanban/useMoveCard";
// Fase 1F: o arrasto confere o "ao sair" da etapa antes do move, como no funil.
import { useMoverComCamposDaEtapa } from "@/hooks/escale/useMoverComCamposDaEtapa";

export type Mover = (args: RecusaDeCampos["args"]) => void;

/**
 * O MOTOR DE UMA ORIGEM dentro do quadro combinado (fork Escale, Fase 1C).
 *
 * Não desenha nada. Liga o tempo real e a rede de segurança dessa origem
 * (`useBoard`) e o arrasto dela (`useMoveCard`, com a recusa de campos
 * obrigatórios e a retomada como novo negócio), e entrega ao quadro o `mover` e
 * os pulsos. São os hooks do funil, sem cópia — um motor por origem porque cada
 * hook é amarrado a um `pipelineId`, e hook não roda dentro de laço.
 */
export function MotorDaOrigem({
  pipelineId,
  onMover,
  onPulsos,
  onCamposFaltando,
  onRetomada,
}: {
  pipelineId: string;
  onMover: (pipelineId: string, mover: Mover | null) => void;
  onPulsos: (pipelineId: string, pulsos: Map<string, number>) => void;
  onCamposFaltando: (pipelineId: string, recusa: RecusaDeCampos) => void;
  onRetomada: (pipelineId: string, retomada: RetomadaPendente) => void;
}) {
  const { pulses } = useBoard(pipelineId);
  const { mutate } = useMoverComCamposDaEtapa(pipelineId, {
    onCamposFaltando: (recusa) => onCamposFaltando(pipelineId, recusa),
    onRetomada: (retomada) => onRetomada(pipelineId, retomada),
  }, { conferir: true });

  useEffect(() => {
    onMover(pipelineId, mutate);
    return () => onMover(pipelineId, null);
  }, [pipelineId, mutate, onMover]);

  useEffect(() => {
    onPulsos(pipelineId, pulses);
  }, [pipelineId, pulses, onPulsos]);

  return null;
}
