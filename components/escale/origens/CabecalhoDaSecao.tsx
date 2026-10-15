import type { ReactNode } from "react";

/**
 * O cabeçalho de cada seção do painel Origens (Origens, Visualizações), como na
 * Clint: ícone + título em destaque, com os botões da seção à direita. As
 * seções são irmãs — o mesmo cabeçalho deixa as duas igualmente fáceis de achar.
 */
export function CabecalhoDaSecao({
  icone,
  titulo,
  children,
}: {
  icone: ReactNode;
  titulo: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5">
      <span className="mr-1 flex shrink-0 text-foreground" aria-hidden>
        {icone}
      </span>
      <h2 className="flex-1 text-xs font-bold tracking-wide text-foreground uppercase">{titulo}</h2>
      {children}
    </div>
  );
}
