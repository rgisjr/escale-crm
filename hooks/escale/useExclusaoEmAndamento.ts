"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { rodando } from "@/components/escale/contatos/massa/textosDasAcoes";

import { useAcoesEmMassa } from "./useAcoesEmMassa";

const INTERVALO_RODANDO_MS = 3000;

export type ExclusaoEmAndamento = { emAndamento: boolean; total: number; feitos: number };

/**
 * A EXCLUSÃO EM MASSA EM ANDAMENTO (fork Escale): lê, na consulta que já existe,
 * as exclusões desta pessoa que ainda estão na fila ou processando, soma o
 * total e os feitos (a faixa de progresso e o botão "Excluir" desligado usam isto)
 * e refaz SÓ a lista da casca quando `feitos` muda ou a exclusão termina, para os
 * excluídos irem sumindo aos poucos. Só pergunta de 3 em 3 s enquanto há exclusão;
 * o pedido novo invalida a consulta e liga o ritmo.
 */
export function useExclusaoEmAndamento(): ExclusaoEmAndamento {
  const qc = useQueryClient();
  const consulta = useAcoesEmMassa(true, (dados) =>
    dados?.minhas.some((a) => a.acao === "excluir" && rodando(a.status))
      ? INTERVALO_RODANDO_MS
      : false,
  );
  const ativas = (consulta.data?.minhas ?? []).filter(
    (a) => a.acao === "excluir" && rodando(a.status),
  );
  const emAndamento = ativas.length > 0;
  const total = ativas.reduce((soma, a) => soma + a.total, 0);
  const feitos = ativas.reduce((soma, a) => soma + a.feitos, 0);

  const anterior = useRef<number | null>(null);
  useEffect(() => {
    const antes = anterior.current;
    anterior.current = emAndamento ? feitos : null;
    if (antes !== null && anterior.current !== antes) {
      void qc.invalidateQueries({ queryKey: ["contacts", "lista-da-casca"] });
      void qc.invalidateQueries({ queryKey: ["contacts", "total-da-casca"] });
    }
  }, [emAndamento, feitos, qc]);

  return { emAndamento, total, feitos };
}
