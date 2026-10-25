"use client";
import type { ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import { ChevronLeft, type LucideIcon } from "@/lib/ui/icons-da-casca";

/** A moldura de uma seção aberta (c14): "‹ {Seção} [ícone]" e o que a seção tem à direita. */
export function SecaoAberta({
  titulo,
  icone: Icone,
  aoVoltar,
  direita,
  children,
}: {
  titulo: string;
  icone: LucideIcon;
  aoVoltar: () => void;
  direita?: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label={t("Voltar")}
          title={t("Voltar")}
          onClick={aoVoltar}
          className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia hover:text-casca-texto"
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        <h3 className="flex items-center gap-2 text-[16px] font-medium text-casca-texto">
          {titulo}
          <Icone size={14} aria-hidden className="text-casca-marca" />
        </h3>
        <span className="ml-auto flex items-center gap-1">{direita}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 pt-3 pb-6">{children}</div>
    </section>
  );
}
