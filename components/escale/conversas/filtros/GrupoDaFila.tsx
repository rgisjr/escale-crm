import type { ReactNode } from "react";

/** Um grupo do painel (c32): o rótulo 13px/500 e o controle 6px abaixo. */
export function GrupoDaFila({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-casca-texto">{rotulo}</span>
      {children}
    </div>
  );
}
