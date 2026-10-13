"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { caminhoDaChave } from "@/lib/escale/preferencia-de-menu";
import { destinoAtivo, type GrupoDoMais } from "@/lib/escale/menu-do-topo";
import { cn } from "@/lib/utils";

export function PainelMais({
  grupos,
  pathnameAtual,
  onNavegar,
}: {
  grupos: GrupoDoMais[];
  pathnameAtual: string;
  onNavegar: () => void;
}) {
  const t = useT();
  return (
    <div
      role="dialog"
      aria-label={t("Todas as telas")}
      className="absolute right-0 top-full z-40 mt-2 grid max-h-[70dvh] w-[min(52rem,calc(100vw-2rem))] grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-6 overflow-auto rounded-lg border bg-card p-5 text-card-foreground shadow-lg"
    >
      {grupos.map(({ grupo, secoes }) => (
        <section key={grupo.id} className="min-w-0 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">{t(grupo.label)}</h2>
          {secoes.map((s) => (
            <div key={s.secao || "_"} className="space-y-1">
              {s.secao ? <p className="text-[11px] text-muted-foreground">{t(s.secao)}</p> : null}
              <ul className="space-y-0.5">
                {s.itens.map((d) => {
                  const ativo = destinoAtivo(pathnameAtual, d.href);
                  return (
                    <li key={d.href}>
                      <Link
                        href={d.href}
                        onClick={onNavegar}
                        aria-current={ativo ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          ativo ? "bg-accent-soft font-semibold" : "hover:bg-accent-soft",
                        )}
                      >
                        <d.icon size={16} aria-hidden />
                        {t(d.label)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      ))}
      <div className="col-span-full flex justify-end border-t pt-3">
        {/* <a> e não <Link>: a rota grava o cookie e o layout precisa ser refeito no servidor. */}
        <a
          href={caminhoDaChave("lateral", pathnameAtual)}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          {t("Voltar ao menu lateral")}
        </a>
      </div>
    </div>
  );
}
