"use client";
import { CONTEUDO_DO_MENU, ITEM_DO_MENU, SOMBRA_DO_MENU } from "@/components/escale/menu/estilos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import type { LinhaDeProspeccao } from "@/lib/escale/prospeccao/tipos";
import { Copy, EllipsisVertical, Pencil } from "@/lib/ui/icons-da-casca";

/** O ⋮ da prospecção (molde 007; D8): rascunho continua; toda linha duplica. */
export function MenuDaProspeccao({
  linha,
  aoContinuar,
  aoDuplicar,
}: {
  linha: LinhaDeProspeccao;
  aoContinuar: () => void;
  aoDuplicar: () => void;
}) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={t("Mais opções")}
        onClick={(e) => e.stopPropagation()}
        className="grid size-7 place-items-center rounded-casca-gatilho text-casca-texto-2 transition-colors hover:bg-casca-raia"
      >
        <EllipsisVertical size={18} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="end"
        className={CONTEUDO_DO_MENU}
        style={SOMBRA_DO_MENU}
        onClick={(e) => e.stopPropagation()}
      >
        {linha.situacao === "rascunho" ? (
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={aoContinuar}>
            <Pencil size={14} aria-hidden />
            {t("Continuar rascunho")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem className={ITEM_DO_MENU} onSelect={aoDuplicar}>
          <Copy size={14} aria-hidden />
          {t("Duplicar prospecção")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
