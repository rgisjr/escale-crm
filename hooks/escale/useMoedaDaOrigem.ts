"use client";
import { QueryClientContext } from "@tanstack/react-query";
import { useContext } from "react";

import { quadroEmCache } from "@/lib/kanban/quadro-em-cache";
import { moedaDaOrigem } from "@/lib/escale/configuracoes/tipos";
import type { MoedaServida } from "@/lib/money";

/**
 * A moeda da origem (fork Escale, Fase 1F, D3), lida do cache do quadro, como a
 * janela de perder já lê os motivos. Sem cache (formulário aberto fora do
 * quadro, como no Inbox), `null`: quem chama cai na moeda da organização, e o
 * banco faz o negócio nascer na moeda certa de qualquer jeito (9007).
 */
export function useMoedaDaOrigem(pipelineId: string): MoedaServida | null {
  // `useContext` e não `useQueryClient`: o formulário também abre onde não há provedor (testes do original).
  const qc = useContext(QueryClientContext);
  return moedaDaOrigem(qc ? quadroEmCache(qc, pipelineId)?.pipeline.settings : undefined);
}
