"use client";
import { useState, type ReactNode } from "react";

import { CONTEUDO_DO_MENU, ITEM_DO_MENU, SOMBRA_DO_MENU } from "@/components/escale/menu/estilos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { EllipsisVertical } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export interface ItemDoMenuDaLinha {
  rotulo: string;
  icone: ReactNode;
  aoEscolher: () => void;
  perigo?: boolean;
  /** Com texto, o item abre a confirmação antes de agir (como "Excluir" de Contatos). */
  confirmar?: string;
  desabilitado?: boolean;
}

/** O ⋮ das tabelas de configuração (c87, c97, c100): itens de 36px, o perigoso em vermelho depois de um separador. */
export function MenuDaLinhaDeConfiguracao({
  itens,
  rotulo,
}: {
  itens: ReadonlyArray<ItemDoMenuDaLinha>;
  rotulo?: string;
}) {
  const t = useT();
  const [confirmando, setConfirmando] = useState<ItemDoMenuDaLinha | null>(null);
  return (
    <Popover open={confirmando !== null} onOpenChange={(o) => !o && setConfirmando(null)}>
      <DropdownMenu>
        <PopoverAnchor asChild>
          <DropdownMenuTrigger
            aria-label={rotulo ?? t("Mais ações")}
            className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia hover:text-casca-texto"
          >
            <EllipsisVertical size={18} aria-hidden />
          </DropdownMenuTrigger>
        </PopoverAnchor>
        <DropdownMenuContent
          side="bottom"
          align="end"
          className={CONTEUDO_DO_MENU}
          style={SOMBRA_DO_MENU}
        >
          {itens.map((item, i) => (
            <span key={item.rotulo}>
              {item.perigo && i > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                disabled={item.desabilitado}
                className={cn(ITEM_DO_MENU, item.perigo && "text-casca-alerta")}
                onSelect={() => (item.confirmar ? setConfirmando(item) : item.aoEscolher())}
              >
                {item.icone}
                {item.rotulo}
              </DropdownMenuItem>
            </span>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <PopoverContent
        side="left"
        className="w-72 rounded-[8px] p-4 text-[13px] text-casca-texto shadow-casca-painel"
      >
        <p>{confirmando?.confirmar}</p>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmando(null)}
            className="h-8 rounded-[4px] border border-casca-borda px-3 font-medium hover:bg-casca-raia"
          >
            {t("Cancelar")}
          </button>
          <button
            type="button"
            onClick={() => {
              confirmando?.aoEscolher();
              setConfirmando(null);
            }}
            className="h-8 rounded-[4px] bg-casca-alerta px-3 font-medium text-white hover:opacity-90"
          >
            {confirmando?.rotulo.split(" ")[0] ?? t("Confirmar")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
