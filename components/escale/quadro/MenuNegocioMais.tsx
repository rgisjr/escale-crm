"use client";
import { useState } from "react";

import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import { Briefcase, Plus } from "@/lib/ui/icons-da-casca";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";

import { BotaoNegocioMais } from "./CabecalhoDaCasca";
import { CAIXA_DO_MENU, ITEM_DO_MENU } from "./estilos-do-menu";

/**
 * "NEGÓCIO +" DA CLINT (fork Escale, Fase 1E; prints 19a/19b e v2-05): o menu
 * com "Novo negócio" e "Importar negócios". Conteúdo e itens montados no
 * primitivo do Radix porque o `DropdownMenuContent` do original fixa borda,
 * raio e o destaque `accent`, que a Clint não usa aqui.
 */
export function MenuNegocioMais({
  desabilitado,
  dica,
  aoNovo,
  aoImportar,
  podeImportar,
}: {
  desabilitado: boolean;
  dica?: string;
  aoNovo: () => void;
  aoImportar: () => void;
  podeImportar: boolean;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  return (
    <DropdownMenu modal={false} open={aberto} onOpenChange={setAberto}>
      <DropdownMenuTrigger asChild disabled={desabilitado}>
        <BotaoNegocioMais
          aberto={aberto}
          disabled={desabilitado}
          title={dica}
          className="disabled:pointer-events-auto disabled:cursor-not-allowed"
        />
      </DropdownMenuTrigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content align="end" sideOffset={8} className={CAIXA_DO_MENU}>
          <MenuPrimitive.Item className={ITEM_DO_MENU} onSelect={aoNovo}>
            <Briefcase size={14} aria-hidden />
            {t("Novo negócio")}
          </MenuPrimitive.Item>
          <MenuPrimitive.Item
            className={ITEM_DO_MENU}
            disabled={!podeImportar}
            title={podeImportar ? undefined : t("Disponível para gerente ou acima.")}
            onSelect={aoImportar}
          >
            <Plus size={14} aria-hidden />
            {t("Importar negócios")}
          </MenuPrimitive.Item>
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </DropdownMenu>
  );
}
