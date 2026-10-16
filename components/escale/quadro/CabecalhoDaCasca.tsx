"use client";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { Plus } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O CABEÇALHO DA PÁGINA DO QUADRO (fork Escale, Casca V4; 01-010): a sobrelinha
 * "NEGÓCIOS DA ORIGEM" (10px, 600, maiúsculas, cinza), o nome grande (26px, 600)
 * e, à direita e alinhado à sobrelinha, a ação ("Negócio +"). Sem seletor no
 * título: na Clint superior, trocar de origem é pelo painel da esquerda.
 */
export function CabecalhoDaCasca({
  sobrelinha,
  titulo,
  acao,
}: {
  sobrelinha: string;
  titulo: string;
  acao?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="mb-1 text-[10px] leading-[15px] font-semibold text-casca-sobrelinha uppercase">
          {sobrelinha}
        </p>
        <h1 className="truncate text-[26px] leading-9 font-semibold text-casca-texto">{titulo}</h1>
      </div>
      {acao ? <div className="mt-[7px] shrink-0">{acao}</div> : null}
    </header>
  );
}

/**
 * "Negócio +" (design system §6.2): o botão da marca. `forwardRef` para servir de
 * gatilho de menu (`DropdownMenuTrigger asChild`) na Visualização.
 */
export const BotaoNegocioMais = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { aberto?: boolean }
>(function BotaoNegocioMais({ aberto = false, ...props }, ref) {
  const t = useT();
  return (
    <BotaoDaCasca ref={ref} type="button" variante="marca" data-aberto={aberto} {...props}>
      {t("Negócio")}
      {/* Fase 1E: com o menu aberto, o "+" gira 45° e vira "×" (Clint superior). */}
      <Plus size={16} aria-hidden className={cn("transition-transform duration-150", aberto && "rotate-45")} />
    </BotaoDaCasca>
  );
});
