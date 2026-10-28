"use client";

import { PopoverAnchor, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { ChevronsUpDown, Funnel } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const BOTAO_DA_BARRA =
  "flex h-8 items-center gap-2 rounded-casca-gatilho border border-casca-borda px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia";

/**
 * O "FILTROS" + ⇕ DA BARRA (prints 2b-01 e 2b-24; Clint `useCollapsibleFilters`).
 * Vai dentro do `<Popover>` do painel. Com a faixa recolhida: o "Filtros" é o
 * gatilho do painel (com o selo da contagem) e o ⇕ abre a faixa. Com a faixa
 * aberta, a Clint tira o par da barra; fica só uma âncora invisível no mesmo lugar,
 * para o painel (aberto pelos chips ou pelo "+ Filtro") nascer onde nascia.
 */
export function ControleDosFiltros({
  faixaAberta,
  quantos,
  aoAlternarFaixa,
  variante = "lista",
}: {
  faixaAberta: boolean;
  quantos: number;
  aoAlternarFaixa: () => void;
  /** `painel` (Indicadores, 10-006): o ícone na cor da marca e o selo cinza. */
  variante?: "lista" | "painel";
}) {
  const t = useT();
  if (faixaAberta) {
    return (
      <PopoverAnchor asChild>
        <span aria-hidden className="block h-8 w-0" />
      </PopoverAnchor>
    );
  }
  return (
    <span className="flex">
      <PopoverTrigger asChild>
        <button type="button" className={cn(BOTAO_DA_BARRA, "rounded-r-none")}>
          <Funnel size={15} aria-hidden className={variante === "painel" ? "text-casca-marca" : undefined} />
          {t("Filtros")}
          {quantos > 0 ? (
            <span
              className={cn(
                "grid size-[18px] place-items-center rounded-full text-[10px] font-semibold",
                variante === "painel" ? "bg-casca-contador text-casca-suave" : "bg-casca-marca text-white",
              )}
            >
              {quantos}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <button
        type="button"
        aria-label={t("Expandir filtros")}
        title={t("Expandir filtros")}
        aria-expanded={false}
        onClick={aoAlternarFaixa}
        className={cn(BOTAO_DA_BARRA, "rounded-l-none border-l-0 px-2")}
      >
        <ChevronsUpDown size={14} aria-hidden />
      </button>
    </span>
  );
}
