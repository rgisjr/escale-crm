"use client";
import { useState } from "react";

import { ImportContactsDialog } from "@/components/contacts/ImportContactsDialog";
import { CONTEUDO_DO_MENU, ITEM_DO_MENU } from "@/components/escale/menu/estilos";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import { Plus, Upload } from "@/lib/ui/icons-da-casca";

import type { OrigemParaCriar } from "./CamposDaOportunidade";
import { JanelaNovoContato } from "./JanelaNovoContato";

/** "Novo contato +" com o menu da Clint (abaixo, à direita): "Novo contato" e "Importar contatos". */
export function MenuNovoContato({
  origens,
  podeCriar,
}: {
  origens: OrigemParaCriar[];
  podeCriar: boolean;
}) {
  const t = useT();
  const [novo, setNovo] = useState(false);
  const [importar, setImportar] = useState(false);
  if (!podeCriar) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <BotaoDaCasca variante="marca">
            {t("Novo contato")}
            <Plus size={15} aria-hidden className="ml-3" />
          </BotaoDaCasca>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={CONTEUDO_DO_MENU}>
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => setNovo(true)}>
            <Plus size={14} aria-hidden />
            {t("Novo contato")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => setImportar(true)}>
            <Upload size={14} aria-hidden />
            {t("Importar contatos")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <JanelaNovoContato aberta={novo} aoFechar={() => setNovo(false)} origens={origens} />
      {importar && <ImportContactsDialog open onOpenChange={(v) => !v && setImportar(false)} />}
    </>
  );
}
