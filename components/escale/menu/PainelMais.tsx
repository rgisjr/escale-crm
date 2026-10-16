"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { caminhoDaChave } from "@/lib/escale/preferencia-de-menu";
import { destinoAtivo, type GrupoDoMais } from "@/lib/escale/menu-do-topo";
import { cn } from "@/lib/utils";

/**
 * O painel "Mais" com o visual do `12-001` da Clint. Esse print é da variante
 * lateral, porque o "⠿ Mais" aberto na superior é print que falta.
 *
 * Medidas (÷ 1,25):
 *   - painel de 280px, branco, borda `#E8E4F5`;
 *   - título "Mais" centralizado numa faixa de 54px;
 *   - grupos com cabeçalho em maiúsculas, espaçado, na cor da marca;
 *   - itens de 33px com ícone de 14px na cor da marca e texto de 12px
 *     `#2F2C5D`, a 20px da borda.
 * A Clint não tem subseções, então as seções do registro viram uma lista só
 * dentro de cada grupo. "Voltar ao menu lateral" é nosso e fica no rodapé.
 */
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
      className="absolute left-0 top-[calc(100%+1px)] z-40 flex max-h-[70dvh] w-[280px] flex-col overflow-hidden rounded-b-md border border-casca-borda bg-surface"
      style={{ boxShadow: "var(--shadow-casca-painel)" }}
    >
      <p className="flex h-[54px] shrink-0 items-center justify-center border-b border-casca-borda text-sm font-semibold text-casca-texto">
        {t("Mais")}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3">
        {grupos.map(({ grupo, secoes }) => (
          <section key={grupo.id} className="pt-4">
            <h2 className="pb-1 text-[10px] font-medium uppercase tracking-[.12em] text-casca-marca">{t(grupo.label)}</h2>
            <ul>
              {secoes
                .flatMap((s) => s.itens)
                .map((d) => {
                  const ativo = destinoAtivo(pathnameAtual, d.href);
                  return (
                    <li key={d.href}>
                      <Link
                        href={d.href}
                        onClick={onNavegar}
                        aria-current={ativo ? "page" : undefined}
                        className={cn(
                          "flex h-[33px] items-center gap-3 text-xs text-casca-texto transition-colors hover:text-casca-marca",
                          ativo && "font-semibold",
                        )}
                      >
                        <d.icon size={14} aria-hidden className="shrink-0 text-casca-marca" />
                        {t(d.label)}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
      <div className="shrink-0 border-t border-casca-borda px-5 py-2.5">
        {/* <a> e não <Link>: a rota grava o cookie e o layout precisa ser refeito no servidor. */}
        <a
          href={caminhoDaChave("lateral", pathnameAtual)}
          className="text-xs text-casca-suave underline-offset-2 hover:underline"
        >
          {t("Voltar ao menu lateral")}
        </a>
      </div>
    </div>
  );
}
