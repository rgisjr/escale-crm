"use client";
import Link from "next/link";
import type { ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { Migalha } from "@/lib/escale/negocio/regras";
import { ChevronRight } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** O TOPO DA FICHA (fork Escale, Fase 1G, C1; print 01): o caminho à esquerda e o próximo negócio à direita (C8). */
export function TopoDaFicha({ migalhas, direita }: { migalhas: Migalha[]; direita?: ReactNode }) {
  const t = useT();
  return (
    <div className="flex h-[46px] shrink-0 items-center justify-between gap-4 border-b border-casca-borda px-6">
      <nav aria-label={t("Caminho do negócio")} className="min-w-0">
        <ol className="flex min-w-0 items-center gap-1.5 text-[13px] text-casca-texto-2">
          {migalhas.map((m, i) => {
            const ultima = i === migalhas.length - 1;
            return (
              <li key={`${i}-${m.rotulo}`} className="flex min-w-0 items-center gap-1.5">
                {i > 0 ? (
                  <ChevronRight size={12} aria-hidden className="shrink-0 text-casca-suave" />
                ) : null}
                {m.href ? (
                  <Link href={m.href} className="truncate hover:underline">
                    {m.rotulo}
                  </Link>
                ) : (
                  <span
                    aria-current={ultima ? "page" : undefined}
                    className={cn("truncate", ultima && "font-semibold text-casca-texto")}
                  >
                    {m.rotulo}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      {direita}
    </div>
  );
}
