"use client";
import type { ReactNode } from "react";

import type { LucideIcon } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O MOLDE DOS VAZIOS DA CLINT (fork Escale, Fase 3A; c01, c75): o ícone num
 * quadrado roxo-claro, o título em 600, o texto em cinza e, se houver, uma
 * ação. O centro, a fila, o painel e as seções usam o mesmo.
 */
export function VazioDaCasca({
  icone: Icone,
  titulo,
  texto,
  acao,
  className,
}: {
  icone: LucideIcon;
  titulo: string;
  texto?: ReactNode;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-2 px-6 text-center", className)}
    >
      <span className="grid size-12 place-items-center rounded-[12px] bg-casca-marca-suave text-casca-marca">
        <Icone size={24} aria-hidden />
      </span>
      <p className="mt-2 text-[14px] font-semibold text-casca-texto">{titulo}</p>
      {texto ? <p className="text-[12px] leading-[18px] text-casca-suave">{texto}</p> : null}
      {acao ? <div className="mt-2">{acao}</div> : null}
    </div>
  );
}
