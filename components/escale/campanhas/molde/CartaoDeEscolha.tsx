"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * O CARTÃO DE ESCOLHA (fork Escale, Fase 8B; 09-018/09-021): borda 1,5px, canto
 * 8px; selecionado = borda e fundo suave da marca. Sem ícone mostra o rádio
 * ("Enviar agora"); com ícone, o quadrado de 28px. O grupo põe `role="radiogroup"`.
 */
export function CartaoDeEscolha({
  selecionado,
  aoEscolher,
  titulo,
  descricao,
  icone,
}: {
  selecionado: boolean;
  aoEscolher: () => void;
  titulo: string;
  descricao: string;
  icone?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selecionado}
      onClick={aoEscolher}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-[8px] border-[1.5px] px-3 py-2.5 text-left",
        selecionado
          ? "border-casca-marca bg-casca-marca-suave"
          : "border-casca-borda bg-surface hover:border-casca-marca-media",
      )}
    >
      {icone ? (
        <span
          aria-hidden
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-[8px]",
            selecionado ? "bg-casca-marca text-white" : "bg-casca-marca-suave text-casca-marca",
          )}
        >
          {icone}
        </span>
      ) : (
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px]",
            selecionado ? "border-casca-marca" : "border-casca-borda",
          )}
        >
          {selecionado && <span className="size-2 rounded-full bg-casca-marca" />}
        </span>
      )}
      <span>
        <span className="block text-[13px] font-medium text-casca-texto">{titulo}</span>
        <span className="mt-0.5 block text-[12px] text-casca-suave">{descricao}</span>
      </span>
    </button>
  );
}
