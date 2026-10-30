"use client";
import { CONTEUDO_DO_MENU, ITEM_DO_MENU, SOMBRA_DO_MENU } from "@/components/escale/menu/estilos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import { MoreVertical, Pencil, Trash2 } from "@/lib/ui/icons-da-casca";

/** O ⋮ da pasta no trilho (07-008): Renomear e Excluir. `modal={false}` como o menu das campanhas. */
export function MenuDaPasta({ aoRenomear, aoExcluir }: { aoRenomear: () => void; aoExcluir: () => void }) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={t("Opções da pasta")}
        className="grid size-5 place-items-center rounded-md text-casca-suave hover:text-casca-texto"
      >
        <MoreVertical size={14} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={CONTEUDO_DO_MENU} style={SOMBRA_DO_MENU}>
        <DropdownMenuItem className={ITEM_DO_MENU} onSelect={aoRenomear}>
          <Pencil size={13} aria-hidden />
          {t("Renomear")}
        </DropdownMenuItem>
        <DropdownMenuItem className={`${ITEM_DO_MENU} text-casca-alerta focus:text-casca-alerta`} onSelect={aoExcluir}>
          <Trash2 size={13} aria-hidden />
          {t("Excluir")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
