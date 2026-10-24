"use client";

import Link from "next/link";
import { Fragment } from "react";

import { useT } from "@/hooks/i18n/useT";

/** A TRILHA DO ASSISTENTE (fork Escale, Fase 8B; 09-018: "Campanhas › WhatsApp › Nova campanha"). */
export function TrilhaDoAssistente({
  itens,
}: {
  itens: ReadonlyArray<{ rotulo: string; href?: string }>;
}) {
  const t = useT();
  return (
    <nav
      aria-label={t("Trilha")}
      className="flex h-12 shrink-0 items-center border-b border-casca-divisoria px-6 text-[13px]"
    >
      {itens.map((item, i) => {
        const ultimo = i === itens.length - 1;
        return (
          <Fragment key={`${item.rotulo}-${i}`}>
            {i > 0 && (
              <span aria-hidden className="mx-1.5 text-[12px] text-casca-meta">
                ›
              </span>
            )}
            {ultimo || !item.href ? (
              <span
                aria-current={ultimo ? "page" : undefined}
                className={ultimo ? "font-medium text-casca-texto" : "text-casca-suave"}
              >
                {item.rotulo}
              </span>
            ) : (
              <Link href={item.href} className="text-casca-suave hover:text-casca-texto">
                {item.rotulo}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
