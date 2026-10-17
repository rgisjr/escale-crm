"use client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/hooks/i18n/useT";

/**
 * O "?" roxo da Clint ao lado de um rótulo e a dica CLARA dele (P06 de
 * docs/clint/prints-1f): cartão branco com sombra, à direita do "?", com o "?"
 * roxo e o texto cinza pequeno. Precisa de um `TooltipProvider` acima.
 */
export function AjudaDaCasca({ texto }: { texto: string }) {
  const t = useT();
  const interrogacao = (
    <span aria-hidden className="text-[10px] leading-none font-semibold text-casca-marca">
      ?
    </span>
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${t("Ajuda")}: ${texto}`}
          className="inline-grid size-3.5 place-items-center"
        >
          {interrogacao}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={8}
        className="flex max-w-[340px] items-start gap-2.5 rounded-[6px] bg-surface px-3 py-2.5 text-[10px] leading-[14px] font-normal text-casca-suave shadow-casca-painel"
      >
        {interrogacao}
        <span>{texto}</span>
      </TooltipContent>
    </Tooltip>
  );
}
