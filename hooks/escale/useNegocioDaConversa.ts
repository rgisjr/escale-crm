"use client";
import { useMemo, useState } from "react";

import { useBoard } from "@/hooks/kanban/useBoard";
import type { Pipeline, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

import { useNegociosDoContato, type NegocioDoContato } from "./useNegociosDoContato";

export interface QuadroDoNegocio {
  lead: Lead;
  pipeline: Pipeline;
  stages: Stage[];
  leads: Lead[];
}

/**
 * O NEGÓCIO DA CONVERSA (fork Escale, Fase 3A; N9). Os negócios do contato
 * vêm da rota do fork; o escolhido (o primeiro aberto, ou o que a pessoa
 * escolheu em "Selecionar negócio") é lido inteiro pelo cache do quadro, o
 * mesmo da ficha — assim ganhar, perder, mover e editar gravam num lugar só.
 */
export function useNegocioDaConversa(contactId: string | null) {
  const negocios = useNegociosDoContato(contactId);
  const lista = useMemo(() => negocios.data ?? [], [negocios.data]);
  const [escolhidoId, setEscolhidoId] = useState<string | null>(null);
  // Trocar de contato não precisa zerar: o id de outro contato não está na lista nova e vale o primeiro.
  const escolhido: NegocioDoContato | null =
    lista.find((n) => n.id === escolhidoId) ?? lista[0] ?? null;
  const board = useBoard(escolhido?.pipeline_id ?? null);
  const quadro: QuadroDoNegocio | null = useMemo(() => {
    if (!escolhido || !board.data) return null;
    const lead = board.data.leads.find((l) => l.id === escolhido.id);
    if (!lead) return null;
    return {
      lead,
      pipeline: board.data.pipeline,
      stages: board.data.stages,
      leads: board.data.leads,
    };
  }, [escolhido, board.data]);
  return {
    negocios: lista,
    escolhido,
    escolher: setEscolhidoId,
    quadro,
    carregando: negocios.isLoading || (!!escolhido && board.isLoading),
    erro: negocios.isError || (!!escolhido && !!board.error && !board.data),
  };
}
