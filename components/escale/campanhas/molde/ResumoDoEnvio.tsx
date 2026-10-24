import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** O CARTÃO DE CONFIRMAÇÃO (fork Escale, Fase 8B; 09-044): linhas ícone + rótulo + valor e o rodapé. */
export function ResumoDoEnvio({
  linhas,
  rodape,
}: {
  linhas: ReadonlyArray<{ icone: ReactNode; rotulo: string; valor: ReactNode }>;
  rodape?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-casca-borda bg-surface shadow-xs">
      <dl>
        {linhas.map((l, i) => (
          <div
            key={l.rotulo}
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              i > 0 && "border-t border-casca-divisoria",
            )}
          >
            <span
              aria-hidden
              className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] bg-casca-marca-suave text-casca-marca"
            >
              {l.icone}
            </span>
            <div className="min-w-0">
              <dt className="text-[12px] text-casca-meta">{l.rotulo}</dt>
              <dd className="text-[13px] text-casca-texto">{l.valor}</dd>
            </div>
          </div>
        ))}
      </dl>
      {rodape}
    </div>
  );
}
