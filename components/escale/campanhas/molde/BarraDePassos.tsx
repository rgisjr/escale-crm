"use client";

import { useT } from "@/hooks/i18n/useT";
import { Check } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** A BARRA DE PASSOS (fork Escale, Fase 8B; 09-018, 09-027, 09-044). `atual` começa em 0. */
export function BarraDePassos({ passos, atual }: { passos: readonly string[]; atual: number }) {
  const t = useT();
  return (
    <ol
      aria-label={t("Passos da campanha")}
      className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-b border-casca-divisoria px-6 py-5"
    >
      {passos.map((rotulo, i) => {
        const estado = i < atual ? "feito" : i === atual ? "atual" : "futuro";
        return (
          <li
            key={rotulo}
            aria-current={estado === "atual" ? "step" : undefined}
            className="flex items-center gap-3"
          >
            {i > 0 && <span aria-hidden className="h-px w-6 bg-casca-borda" />}
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-[22px] items-center justify-center rounded-full text-[11px]",
                  estado === "atual"
                    ? "bg-casca-marca font-semibold text-white"
                    : "border border-casca-borda text-casca-suave",
                )}
              >
                {estado === "feito" ? <Check className="size-3" aria-hidden /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-[13px]",
                  estado === "atual"
                    ? "font-medium text-casca-marca"
                    : estado === "feito"
                      ? "text-casca-texto"
                      : "text-casca-texto-2",
                )}
              >
                {rotulo}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
