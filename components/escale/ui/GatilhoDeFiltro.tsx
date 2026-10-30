"use client";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { ChevronDown } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O GATILHO DE FILTRO DA CASCA (fork Escale, casca igual à Clint V1).
 *
 * "Data", "Campos", "Tags", "Dono do negócio", "Status" e "Mais filtros" na
 * barra da Clint (menu superior). Medido nos prints, em px de CSS:
 * - repouso: sem fundo, texto #3E3A6F 0,7rem peso 500, chevron 11px #7489A8,
 *   gap 10px, 36px de altura, 10px de padding, canto de 6px;
 * - hover: fundo #EFF3FF;
 * - aberto: fundo #2F2C5D, texto e chevron brancos (o chevron não gira);
 * - contagem: círculo de 18px #E0E0E0 com o número, antes do chevron.
 *
 * Feito para `<PopoverTrigger asChild>`: o "aberto" vem do `aria-expanded`
 * que o Radix injeta, ou da prop `aberto`. O `rotulo` chega traduzido.
 */
export type GatilhoDeFiltroProps = {
  rotulo: string;
  contagem?: number;
  aberto?: boolean;
  /** Fase 5A: ícone antes do rótulo (o robô do filtro Agente das automações). */
  icone?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export const GatilhoDeFiltro = forwardRef<HTMLButtonElement, GatilhoDeFiltroProps>(function GatilhoDeFiltro(
  { rotulo, contagem, aberto, icone, className, type = "button", ...resto },
  ref,
) {
  const expandido = resto["aria-expanded"];
  const estaAberto = aberto ?? (expandido === true || expandido === "true");
  const temContagem = contagem !== undefined && contagem > 0;
  return (
    <button
      ref={ref}
      type={type}
      data-aberto={estaAberto ? "" : undefined}
      className={cn(
        "inline-flex h-9 items-center gap-2.5 whitespace-nowrap rounded-casca-gatilho px-2.5 text-[0.7rem] font-medium transition-colors duration-fast ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-casca-marca",
        estaAberto
          ? "bg-casca-escuro text-white"
          : "bg-transparent text-casca-texto-2 hover:bg-casca-raia hover:text-casca-texto",
        className,
      )}
      {...resto}
    >
      {icone}
      <span>{rotulo}</span>
      {temContagem ? (
        <>
          {" "}
          <span className="grid size-[18px] place-items-center rounded-full bg-casca-cinza-selo text-[10px] font-semibold text-casca-texto">
            {contagem}
          </span>
        </>
      ) : null}
      <ChevronDown
        aria-hidden
        strokeWidth={2.5}
        className={cn("size-[11px] shrink-0", estaAberto ? "text-white" : "text-casca-chevron")}
      />
    </button>
  );
});
