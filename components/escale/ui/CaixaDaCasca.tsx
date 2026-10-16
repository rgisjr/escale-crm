"use client";
import type { KeyboardEvent } from "react";

import { Check, Minus } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * A CAIXA DE MARCAR DA CASCA (fork Escale, casca igual à Clint V1).
 *
 * Substitui o checkbox nativo dentro da casca. Visual do `form.checkbox` da
 * Clint: 16px, canto de 2px; vazia com borda #D5DCFF e fundo #DFE2FD;
 * marcada com a cor da marca da organização (no lugar do roxo) e o check
 * branco. Responde como checkbox: `role="checkbox"`, `aria-checked` com
 * `mixed` para a parcial, o Espaço alterna e o Enter não.
 */
export type CaixaDaCascaProps = {
  marcada: boolean | "indeterminada";
  aoMudar: (v: boolean) => void;
  rotulo?: string;
  "aria-label"?: string;
  desabilitada?: boolean;
};

export function CaixaDaCasca({
  marcada,
  aoMudar,
  rotulo,
  "aria-label": rotuloAcessivel,
  desabilitada = false,
}: CaixaDaCascaProps) {
  const cheia = marcada !== false;

  function alternar() {
    if (!desabilitada) aoMudar(marcada !== true);
  }

  function tecla(e: KeyboardEvent<HTMLButtonElement>) {
    // Caixa de marcar responde ao Espaço (o padrão do botão); o Enter não marca.
    if (e.key === "Enter") e.preventDefault();
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada === "indeterminada" ? "mixed" : marcada}
      aria-label={rotuloAcessivel}
      disabled={desabilitada}
      onClick={alternar}
      onKeyDown={tecla}
      className="group inline-flex items-center gap-2 text-[12px] text-casca-texto focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        aria-hidden
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-[2px] border transition-colors duration-fast ease-out group-focus-visible:ring-2 group-focus-visible:ring-casca-marca group-focus-visible:ring-offset-1",
          cheia ? "border-casca-marca bg-casca-marca text-accent-foreground" : "border-casca-caixa-borda bg-casca-caixa",
        )}
      >
        {marcada === true ? <Check className="size-3" strokeWidth={3} /> : null}
        {marcada === "indeterminada" ? <Minus className="size-3" strokeWidth={3} /> : null}
      </span>
      {rotulo ? <span>{rotulo}</span> : null}
    </button>
  );
}
