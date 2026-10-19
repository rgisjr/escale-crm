"use client";
import Link from "next/link";
import { Fragment } from "react";

import { useT } from "@/hooks/i18n/useT";
import { X } from "@/lib/ui/icons-da-casca";

/** O cabeçalho de toda tela de configuração (c37–c41, c99): migalhas 13px e o X que volta à conversa. */
export function CabecaDaConfiguracao({
  migalhas,
  fecharPara = "/app/inbox",
}: {
  migalhas: ReadonlyArray<{ rotulo: string; href?: string }>;
  fecharPara?: string;
}) {
  const t = useT();
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-casca-borda px-6">
      <nav aria-label={t("Você está em")} className="flex min-w-0 items-center gap-2 text-[13px]">
        {migalhas.map((m, i) => {
          const ultima = i === migalhas.length - 1;
          return (
            <Fragment key={`${m.rotulo}-${i}`}>
              {i > 0 ? (
                <span aria-hidden className="text-casca-suave">
                  ›
                </span>
              ) : null}
              {ultima || !m.href ? (
                <span
                  className={
                    ultima ? "truncate font-semibold text-casca-texto" : "text-casca-suave"
                  }
                >
                  {m.rotulo}
                </span>
              ) : (
                <Link href={m.href} className="truncate text-casca-suave hover:text-casca-texto">
                  {m.rotulo}
                </Link>
              )}
            </Fragment>
          );
        })}
      </nav>
      <span className="flex-1" />
      <Link
        href={fecharPara}
        aria-label={t("Fechar")}
        className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
      >
        <X size={18} aria-hidden />
      </Link>
    </header>
  );
}
