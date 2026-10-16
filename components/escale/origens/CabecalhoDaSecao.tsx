import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * O cabeçalho de cada seção do painel — ORIGENS, VISUALIZAÇÕES e, quando a
 * Fase 1E entrar, RECENTES — como na Clint (01-010):
 * - 48px de altura e a divisória #E8E4F5 embaixo;
 * - ícone de 16px a 16px da borda e título 11px/600 em caixa alta a 44px;
 * - as ações à direita, a 12px da borda.
 *
 * O hover nomeado `group/cabecalho` revela ações escondidas, como o `+`.
 */
export function CabecalhoDaSecao({
  icone,
  titulo,
  children,
  className,
}: {
  icone: ReactNode;
  titulo: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group/cabecalho flex h-12 shrink-0 items-center gap-3 border-b border-casca-borda pr-3 pl-4",
        className,
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center text-casca-texto" aria-hidden>
        {icone}
      </span>
      <h2 className="min-w-0 flex-1 truncate text-[11px] font-semibold text-casca-texto uppercase">{titulo}</h2>
      {children && <div className="flex shrink-0 items-center">{children}</div>}
    </div>
  );
}
