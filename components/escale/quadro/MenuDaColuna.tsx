"use client";
import { useId, useState } from "react";

import * as PopoverPrimitive from "@radix-ui/react-popover";

import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/hooks/i18n/useT";
import { quantidadeDigitada } from "@/lib/escale/quadro/selecao";
import { EllipsisVertical, HelpCircle } from "@/lib/ui/icons-da-casca";

import { CAIXA_DO_MENU, ITEM_DO_MENU } from "./estilos-do-menu";

/**
 * O ⋮ DA ETAPA (fork Escale, Fase 1E; Clint superior: `bt-select-all-stage-deals`
 * e `input-stage-deal-qty`). "Selecionar todos..." marca a etapa toda; "Selecione
 * [N]" marca os N primeiros a cada tecla. Sem "Desmarcar todos": a Clint não tem,
 * e o "Limpar" da barra de lote desfaz.
 */
export function MenuDaColuna({
  nome,
  total,
  aoSelecionar,
}: {
  nome: string;
  total: number;
  aoSelecionar: (n: number) => void;
}) {
  const t = useT();
  const idDoCampo = useId();
  const [aberto, setAberto] = useState(false);
  const [quantos, setQuantos] = useState("0");
  const dica = t("Escolha quantos negócios você quer selecionar");

  return (
    <Popover
      open={aberto}
      onOpenChange={(a) => {
        setAberto(a);
        if (!a) setQuantos("0");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${t("Ações da etapa")} ${nome}`}
          className="grid h-7 w-5 shrink-0 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-surface"
        >
          <EllipsisVertical size={18} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={4}
          className={`${CAIXA_DO_MENU} w-[200px]`}
        >
          <button
            type="button"
            disabled={total === 0}
            title={total === 0 ? t("Nenhum negócio nesta etapa") : undefined}
            onClick={() => {
              aoSelecionar(total);
              setAberto(false);
            }}
            className={ITEM_DO_MENU}
          >
            {t("Selecionar todos...")}
          </button>
          <div className="flex h-9 items-center gap-1 px-3 text-[11px] font-medium text-casca-texto">
            <label htmlFor={idDoCampo}>{t("Selecione")}</label>
            {/* O campo numérico com setinhas da Clint (print 18b), que começa em 0. */}
            <input
              id={idDoCampo}
              type="number"
              min={0}
              max={total}
              value={quantos}
              onChange={(e) => {
                // Digitação parcial inválida ("-", "e", "2."): o navegador informa "";
                // mantém o que a pessoa digitou e a seleção de antes.
                if (e.target.validity.badInput) return;
                const texto = e.target.value;
                const n = quantidadeDigitada(texto, total);
                setQuantos(texto.trim() === "" ? "" : String(n));
                aoSelecionar(n);
              }}
              className="ml-1 h-[23px] w-[65px] rounded-[5px] border-[0.8px] border-[#E8E4F5] bg-[#F8FAFF] p-[3px] text-center text-[11.9px] font-light text-casca-texto outline-hidden focus:border-casca-marca"
            />
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} aria-label={dica} className="ml-2 text-casca-marca">
                    <HelpCircle size={17} aria-hidden />
                  </span>
                </TooltipTrigger>
                <TooltipContent>{dica}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </Popover>
  );
}
