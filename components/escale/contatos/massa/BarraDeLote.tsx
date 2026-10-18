"use client";
import type { ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import { Trash2, X } from "@/lib/ui/icons-da-casca";

export const BOTAO_DA_BARRA_DE_LOTE =
  "inline-flex h-9 items-center gap-1.5 rounded-[6px] px-3 text-[13px] font-medium text-white hover:bg-casca-marca-forte disabled:cursor-not-allowed disabled:opacity-60";

/**
 * A BARRA DE AÇÕES EM MASSA (prints 2b-29, 2b-30, 2b-37 e 2b-39; Clint
 * `index-aSHo0T15`): fixa no rodapé, centralizada, na cor da marca: "×" (Remover
 * selecionados), o número em branco (sem selo), a palavra SELECIONADOS, a divisória
 * e as ações. "Campos" espera a 2C (Q3).
 */
export function BarraDeLote({
  quantidade,
  aoLimpar,
  aoCriarNegocio,
  painelDeTag,
  aoExportar,
  aoExcluir,
}: {
  quantidade: number;
  aoLimpar: () => void;
  aoCriarNegocio: () => void;
  painelDeTag: ReactNode;
  aoExportar: () => void;
  aoExcluir: () => void;
}) {
  const t = useT();
  return (
    <div
      role="toolbar"
      aria-label={t("Ações em massa")}
      className="fixed bottom-3 left-1/2 z-40 flex h-[52px] -translate-x-1/2 items-center gap-1 rounded-[8px] bg-casca-marca px-4 text-white shadow-casca-painel"
    >
      <button
        type="button"
        aria-label={t("Remover selecionados")}
        title={t("Remover selecionados")}
        onClick={aoLimpar}
        className={BOTAO_DA_BARRA_DE_LOTE}
      >
        <X size={16} aria-hidden />
      </button>
      <span className="ml-2 text-[13px] font-semibold">{quantidade.toLocaleString("pt-BR")}</span>
      <span className="mr-2 ml-3 text-[11px] font-medium uppercase">{t("selecionados")}</span>
      <span aria-hidden className="mx-1 h-full w-px bg-surface opacity-40" />
      <button type="button" onClick={aoCriarNegocio} className={BOTAO_DA_BARRA_DE_LOTE}>
        {t("Criar negócio")}
      </button>
      <button type="button" disabled title={t("Em breve")} className={BOTAO_DA_BARRA_DE_LOTE}>
        {t("Campos")}
      </button>
      {painelDeTag}
      <button type="button" onClick={aoExportar} className={BOTAO_DA_BARRA_DE_LOTE}>
        {t("Exportar")}
      </button>
      <button
        type="button"
        aria-label={t("Excluir selecionados")}
        title={t("Excluir selecionados")}
        onClick={aoExcluir}
        className={BOTAO_DA_BARRA_DE_LOTE}
      >
        <Trash2 size={18} aria-hidden />
      </button>
    </div>
  );
}
