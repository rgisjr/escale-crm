"use client";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useState } from "react";

import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import { ORDENS, ROTULO_DA_ORDEM, type Ordem } from "@/lib/escale/conversas/ordem";
import { ArrowDownUp, Check } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export const BOTAO_DA_BARRA =
  "grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia hover:text-casca-texto disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50";

/** "Ordenar por" (c43): Última interação ✓ / Esperando mais tempo. */
export function MenuDeOrdem({ ordem, aoMudar }: { ordem: Ordem; aoMudar: (o: Ordem) => void }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  return (
    <DropdownMenu modal={false} open={aberto} onOpenChange={setAberto}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("Ordenar por")}
          title={t("Ordenar por")}
          className={cn(
            BOTAO_DA_BARRA,
            (aberto || ordem !== "interacao") && "bg-casca-marca-suave text-casca-marca",
          )}
        >
          <ArrowDownUp size={16} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          align="end"
          sideOffset={6}
          className={cn(CAIXA_DO_MENU, "w-[160px]")}
        >
          {ORDENS.map((o) => (
            <MenuPrimitive.Item
              key={o}
              className={cn(ITEM_DO_MENU, "h-9 text-[12px]", o === ordem && "text-casca-marca")}
              onSelect={() => aoMudar(o)}
            >
              <span className="flex-1">{t(ROTULO_DA_ORDEM[o])}</span>
              {o === ordem ? <Check size={14} aria-hidden /> : null}
            </MenuPrimitive.Item>
          ))}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </DropdownMenu>
  );
}
