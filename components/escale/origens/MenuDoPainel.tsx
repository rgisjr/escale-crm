"use client";
import type { ComponentProps } from "react";

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical } from "@/lib/ui/icons-da-casca";
import type { Settings } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { BOTAO_DE_ICONE } from "./estilos-do-painel";

/** Qualquer ícone lucide (todos têm o mesmo tipo). */
type IconeDoMenu = typeof Settings;

/** O ⋮ das linhas do painel: cinza em repouso, na cor da marca com o menu aberto (01-032/033). */
export function Tres({ rotulo }: { rotulo: string }) {
  return (
    <DropdownMenuTrigger asChild>
      <button type="button" aria-label={rotulo} className={cn(BOTAO_DE_ICONE, "data-[state=open]:text-casca-marca")}>
        <EllipsisVertical size={16} aria-hidden />
      </button>
    </DropdownMenuTrigger>
  );
}

/**
 * A caixa do menu (01-032/033): branca, raio 8, sem borda, a sombra do painel e
 * 4px de respiro. Abre à direita do ⋮, com o topo alinhado ao dele. Embrulha o
 * `DropdownMenuContent` do original só com classes: o menu do original não muda.
 */
export function ConteudoDoMenu({ className, ...props }: ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      side="right"
      align="start"
      sideOffset={6}
      {...props}
      className={cn(
        "min-w-0 rounded-[8px] border-0 bg-surface p-1 text-casca-texto shadow-casca-painel",
        className,
      )}
    />
  );
}

/** Um item de 36px: ícone de 14px e texto 12px. `perigo` pinta texto e ícone de vermelho (o "Excluir"). */
export function ItemDoMenu({
  icone: Icone,
  perigo = false,
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuItem> & { icone: IconeDoMenu; perigo?: boolean }) {
  return (
    <DropdownMenuItem
      {...props}
      className={cn(
        "h-9 gap-2 rounded-[4px] px-3 py-0 text-xs text-casca-texto focus:bg-casca-marca-suave focus:text-casca-texto [&>svg]:size-3.5",
        perigo && "text-casca-alerta focus:text-casca-alerta",
        className,
      )}
    >
      <Icone size={14} aria-hidden />
      {children}
    </DropdownMenuItem>
  );
}

/** A divisória antes de "Arquivar" (01-032/033), na cor das bordas da casca. */
export function SeparadorDoMenu() {
  return <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-casca-borda" />;
}
