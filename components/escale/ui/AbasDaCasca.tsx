"use client";
import { cn } from "@/lib/utils";

/** As abas da janela da origem (P01): texto 13px navy, sublinhado de 3px na cor da marca na ativa. */
export function AbasDaCasca<V extends string>({
  abas,
  valor,
  aoMudar,
  "aria-label": rotulo,
}: {
  abas: { valor: V; rotulo: string }[];
  valor: V;
  aoMudar: (v: V) => void;
  "aria-label": string;
}) {
  return (
    <div role="tablist" aria-label={rotulo} className="flex gap-0 border-b border-casca-borda">
      {abas.map((a) => {
        const ativa = a.valor === valor;
        return (
          <button
            key={a.valor}
            type="button"
            role="tab"
            aria-selected={ativa}
            onClick={() => aoMudar(a.valor)}
            className={cn(
              "relative px-2 pt-1 pb-2.5 text-[13px] text-casca-texto transition",
              ativa &&
                "after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-casca-marca",
            )}
          >
            {a.rotulo}
          </button>
        );
      })}
    </div>
  );
}
