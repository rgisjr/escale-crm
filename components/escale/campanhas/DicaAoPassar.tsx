"use client";
import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A DICA DE PASSAR O MOUSE DA LISTA DE CAMPANHAS (fork Escale, Fase 8A; 008;
 * N17): a pílula pequena acima do alvo, sem seta. Sem o Tooltip do Radix de
 * propósito — ele exige `TooltipProvider` acima, e tela nova sem o provedor já
 * derrubou o Atendimento. Aparece também com o foco.
 */
export function DicaAoPassar({
  texto,
  children,
  className,
  bloco = false,
}: {
  texto: string;
  children: ReactNode;
  className?: string;
  /** Ocupa a largura toda (os cartões do resumo). */
  bloco?: boolean;
}) {
  const [aberta, setAberta] = useState(false);
  const id = useId();
  return (
    <span
      className={cn("relative", bloco ? "flex w-full" : "inline-flex")}
      onMouseEnter={() => setAberta(true)}
      onMouseLeave={() => setAberta(false)}
      onFocus={() => setAberta(true)}
      onBlur={() => setAberta(false)}
      aria-describedby={aberta ? id : undefined}
    >
      {children}
      {aberta ? (
        <span
          role="tooltip"
          id={id}
          className={cn(
            "pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-max max-w-[260px] -translate-x-1/2 rounded-[4px] bg-casca-escuro px-2 py-1 text-[11px] leading-4 font-normal text-white shadow-casca-painel",
            className,
          )}
        >
          {texto}
        </span>
      ) : null}
    </span>
  );
}
