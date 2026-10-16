"use client";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";

/**
 * O "?" do topo da Clint: "?" na cor da marca (`#7C00FF` na Clint) sobre um
 * círculo lilás de 24px (`#F2EDFF` → `casca-marca-suave`).
 *
 * O que ele abre na Clint é print que falta, e o Escale não tem central de
 * ajuda. Por isso o painel mostra só os atalhos que existem. O selo vermelho
 * ("2" na Clint) não aparece: não temos de onde tirar o número. Decisão D3.
 */
export function AjudaDoTopo() {
  const t = useT();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("Ajuda")}
          data-testid="ajuda-do-topo"
          className="grid size-6 place-items-center rounded-full bg-casca-marca-suave text-[13px] font-semibold leading-none text-casca-marca outline-hidden focus-visible:ring-2 focus-visible:ring-casca-marca"
        >
          ?
        </button>
      </PopoverTrigger>
      <PainelSuspenso align="end" sideOffset={8} className="w-64 p-3">
        <p className="text-xs font-semibold text-casca-texto">{t("Ajuda")}</p>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[.08em] text-casca-sobrelinha">
          {t("Atalhos do teclado")}
        </p>
        <ul className="mt-1.5 space-y-1.5">
          <li className="flex items-center justify-between text-xs text-casca-texto">
            <span>{t("Buscar uma tela")}</span>
            <kbd className="rounded-sm bg-casca-raia px-1.5 py-0.5 text-[10px] text-casca-texto-2">⌘K</kbd>
          </li>
          <li className="flex items-center justify-between text-xs text-casca-texto">
            <span>{t("Trocar o tema")}</span>
            <kbd className="rounded-sm bg-casca-raia px-1.5 py-0.5 text-[10px] text-casca-texto-2">⌘⇧L</kbd>
          </li>
        </ul>
      </PainelSuspenso>
    </Popover>
  );
}
