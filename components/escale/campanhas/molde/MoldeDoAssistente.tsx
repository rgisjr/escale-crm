"use client";

import type { ReactNode } from "react";

import { BarraDePassos } from "./BarraDePassos";

/**
 * O MOLDE DO ASSISTENTE (fork Escale, Fase 8B; 09-018): trilha, barra de
 * passos, conteúdo com rolagem própria (largura máxima 1050px, formulário e,
 * quando há, a coluna da prévia de 340px) e o rodapé. A altura é a da lista de
 * Contatos da casca (o topo e a reserva do rodapé ocupado).
 */
export function MoldeDoAssistente({
  trilha,
  passos,
  atual,
  rodape,
  children,
  lateral,
}: {
  trilha: ReactNode;
  passos: readonly string[];
  atual: number;
  rodape: ReactNode;
  children: ReactNode;
  lateral?: ReactNode;
}) {
  return (
    <div className="flex h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] min-h-[28rem] flex-col bg-surface md:[body:has([data-escale-casca])_&]:h-[calc(100dvh-2.75rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))]">
      {trilha}
      <BarraDePassos passos={passos} atual={atual} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1050px] gap-10 px-6 pt-9 pb-10">
          <div className="min-w-0 flex-1">{children}</div>
          {lateral && (
            <aside className="hidden w-[340px] shrink-0 min-[1100px]:block">{lateral}</aside>
          )}
        </div>
      </div>
      {rodape}
    </div>
  );
}
