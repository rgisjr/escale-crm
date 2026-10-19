"use client";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";

import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import { EllipsisVertical, Glasses, ListChecks, SlidersHorizontal } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { BOTAO_DA_BARRA } from "./MenuDeOrdem";

/** O ⋮ "Mais" (c22, c24, c81): Selecionar (3D), modo espião, Personalizar visualização. */
export function MenuMaisDaFila({
  espiao,
  aoMudarEspiao,
  aoPersonalizar,
  foraDoPadrao,
}: {
  espiao: boolean;
  aoMudarEspiao: (v: boolean) => void;
  aoPersonalizar: () => void;
  foraDoPadrao: boolean;
}) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={t("Mais")} title={t("Mais")} className={BOTAO_DA_BARRA}>
          <EllipsisVertical size={16} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          align="end"
          sideOffset={6}
          className={cn(CAIXA_DO_MENU, "w-[190px]")}
        >
          <MenuPrimitive.Item
            disabled
            title={t("Em breve")}
            className={cn(ITEM_DO_MENU, "h-9 text-[12px]")}
          >
            <ListChecks size={16} aria-hidden />
            {t("Selecionar")}
          </MenuPrimitive.Item>
          <MenuPrimitive.Item
            className={cn(ITEM_DO_MENU, "h-9 text-[12px]")}
            onSelect={() => aoMudarEspiao(!espiao)}
          >
            <Glasses size={16} aria-hidden />
            {espiao ? t("Desativar modo espião") : t("Ativar modo espião")}
          </MenuPrimitive.Item>
          <MenuPrimitive.Item
            className={cn(ITEM_DO_MENU, "h-9 text-[12px]")}
            onSelect={aoPersonalizar}
          >
            <SlidersHorizontal size={16} aria-hidden />
            <span className="flex-1">{t("Personalizar visualização")}</span>
            {foraDoPadrao ? (
              <span
                data-testid="ponto-fora-do-padrao"
                aria-hidden
                className="size-1.5 rounded-full bg-casca-marca"
              />
            ) : null}
          </MenuPrimitive.Item>
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </DropdownMenu>
  );
}
