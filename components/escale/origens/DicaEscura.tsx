"use client";
import { TooltipArrow } from "@radix-ui/react-tooltip";
import type { ReactElement } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * A DICA ESCURA DA CLINT (01-034, "Nova origem"):
 * - balão #3E3A6F acima do botão, com a seta para baixo;
 * - texto branco 11px/500, raio 4;
 * - a sombra curta do tooltip legado (`#afafaf29 0 3px 6px`).
 *
 * Embrulha o `TooltipContent` do original só com classes. `overflow-visible`
 * deixa a seta sair da caixa. Precisa de um `TooltipProvider` acima: o painel
 * põe um em volta de tudo.
 */
export function DicaEscura({ texto, children }: { texto: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="overflow-visible rounded-[4px] bg-casca-texto-2 px-2 py-1 text-[11px] font-medium text-white shadow-[0_3px_6px_#afafaf29]"
      >
        {texto}
        <TooltipArrow width={10} height={5} className="fill-casca-texto-2" />
      </TooltipContent>
    </Tooltip>
  );
}
