"use client";
import { Fragment } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { DiaDaColuna } from "@/lib/escale/negocio/atividades";
import { List } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const CHIP =
  "relative flex h-[38px] w-10 flex-col items-center justify-center rounded-[6px] border bg-surface";

/**
 * A COLUNA "DIAS" (fork Escale, Fase 1I; prints G01 e 017): "Todas" e um chip
 * por dia com atividade (dia, semana ou "Hoje", o mês acima quando muda e o
 * selo vermelho das atrasadas). Some quando nenhuma atividade tem data (Clint).
 */
export function ColunaDosDias({
  dias,
  escolhido,
  aoEscolher,
}: {
  dias: DiaDaColuna[];
  escolhido: string | null;
  aoEscolher: (chave: string | null) => void;
}) {
  const t = useT();
  if (dias.length === 0) return null;
  const marca = (ativo: boolean) =>
    ativo
      ? "border-casca-borda shadow-[inset_3px_0_0_var(--color-casca-marca)] text-casca-marca"
      : "border-casca-borda text-casca-texto hover:bg-casca-raia";
  return (
    <nav
      aria-label={t("Dias")}
      className="flex w-[59px] shrink-0 flex-col items-center border-r border-casca-borda"
    >
      <span className="flex h-10 items-center text-[11px] font-semibold text-casca-marca">
        {t("Dias")}
      </span>
      <div className="flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto pt-2 pb-3">
        <button
          type="button"
          aria-label={t("Todas")}
          aria-pressed={escolhido === null}
          onClick={() => aoEscolher(null)}
          className={cn(CHIP, marca(escolhido === null))}
        >
          <List size={14} aria-hidden />
        </button>
        {dias.map((d) => (
          <Fragment key={d.chave}>
            {d.mes ? (
              <span className="mt-2 text-[9px] font-semibold text-casca-meta">{d.mes}</span>
            ) : null}
            <button
              type="button"
              aria-label={`${d.dia} ${d.semana}`}
              aria-pressed={escolhido === d.chave}
              onClick={() => aoEscolher(d.chave)}
              className={cn(CHIP, marca(escolhido === d.chave))}
            >
              <span className="text-[13px] leading-none font-semibold">{d.dia}</span>
              <span className="text-[8px] font-semibold uppercase">{d.semana}</span>
              {d.atrasadas > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 grid size-[14px] place-items-center rounded-full bg-casca-alerta text-[9px] font-bold text-white">
                  {d.atrasadas}
                </span>
              ) : null}
            </button>
          </Fragment>
        ))}
      </div>
    </nav>
  );
}
