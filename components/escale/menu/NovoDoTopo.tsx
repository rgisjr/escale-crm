"use client";
import Link from "next/link";
import { useState } from "react";

import { NewContactDialog } from "@/components/contacts/NewContactDialog";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import type { AcaoDeCriar } from "@/lib/escale/menu-do-topo";
import { Building2, FileText, Megaphone, Plus, UserPlus } from "@/lib/ui/icons-da-casca";

import { CONTEUDO_DO_MENU, ITEM_DO_MENU, SOMBRA_DO_MENU } from "./estilos";

const ICONE = { contato: UserPlus, empresa: Building2, campanha: Megaphone, proposta: FileText } as const;

/**
 * O "Novo +" azul do topo da Clint: 53×22, `#597EFF` (copiado; não é a marca),
 * texto branco 11px/500 e raio ~5.
 *
 * O menu aberto da Clint é print que falta. Entram só as criações que o Escale
 * já tem (Decisão D4).
 */
export function NovoDoTopo({ acoes }: { acoes: readonly AcaoDeCriar[] }) {
  const t = useT();
  const [contatoAberto, setContatoAberto] = useState(false);
  if (acoes.length === 0) return null;
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <BotaoDaCasca variante="novo" data-testid="novo-do-topo" className="h-[22px] gap-1 px-2 text-[11px] font-medium">
            {t("Novo")}
            <Plus size={12} strokeWidth={2.5} aria-hidden />
          </BotaoDaCasca>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className={CONTEUDO_DO_MENU} style={SOMBRA_DO_MENU}>
          {acoes.map((a) => {
            const Icone = ICONE[a.id];
            return a.destino ? (
              <DropdownMenuItem key={a.id} asChild className={ITEM_DO_MENU}>
                <Link href={a.destino}>
                  <Icone aria-hidden />
                  {t(a.rotulo)}
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem key={a.id} className={ITEM_DO_MENU} onSelect={() => setContatoAberto(true)}>
                <Icone aria-hidden />
                {t(a.rotulo)}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {contatoAberto ? <NewContactDialog open onOpenChange={setContatoAberto} /> : null}
    </>
  );
}
