"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { ROTA_DO_EDITOR } from "@/lib/escale/indicadores/rotas";
import { Plus } from "@/lib/ui/icons-da-casca";

/**
 * O CABEÇALHO DE INDICADORES (10-001): "Indicadores" e, para gerente ou acima,
 * "Novo chart +" (contorno; o editor nasce na 7D) e "Novo dashboard +" (sólido na marca).
 */
export function CabecalhoDosIndicadores({
  podeGerir,
  aoNovoDashboard,
}: {
  podeGerir: boolean;
  aoNovoDashboard: () => void;
}) {
  const t = useT();
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-casca-divisoria px-6">
      <h1 className="text-[18px] font-medium text-casca-texto">{t("Indicadores")}</h1>
      {podeGerir ? (
        <div className="flex items-center gap-2">
          <Link
            href={ROTA_DO_EDITOR}
            className="inline-flex h-8 items-center gap-2 rounded-casca-gatilho border border-casca-borda bg-surface px-3.5 text-[13px] whitespace-nowrap text-casca-texto transition-colors hover:bg-casca-raia"
          >
            {t("Novo chart")}
            <Plus size={16} aria-hidden />
          </Link>
          <button
            type="button"
            onClick={aoNovoDashboard}
            className="inline-flex h-8 items-center gap-2 rounded-casca-gatilho bg-casca-marca px-3.5 text-[13px] font-medium whitespace-nowrap text-white transition-colors hover:bg-casca-marca-forte"
          >
            {t("Novo dashboard")}
            <Plus size={16} aria-hidden />
          </button>
        </div>
      ) : null}
    </header>
  );
}
