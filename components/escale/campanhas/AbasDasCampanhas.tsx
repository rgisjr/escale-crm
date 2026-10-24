"use client";
import { useT } from "@/hooks/i18n/useT";
import { ROTULO_DA_ABA, type AbaDasCampanhas } from "@/lib/escale/campanhas/rotas";
import { cn } from "@/lib/utils";

/** AS ABAS DE CANAL (002; PRD A2): 15px/500, o sublinhado de 3px da marca na ativa. */
export function AbasDasCampanhas({
  abas,
  valor,
  aoMudar,
}: {
  abas: readonly AbaDasCampanhas[];
  valor: AbaDasCampanhas;
  aoMudar: (aba: AbaDasCampanhas) => void;
}) {
  const t = useT();
  return (
    <div
      role="tablist"
      aria-label={t("Canais de campanha")}
      className="flex h-9 shrink-0 items-end border-b border-casca-divisoria px-6"
    >
      {abas.map((aba) => {
        const ativa = aba === valor;
        return (
          <button
            key={aba}
            type="button"
            role="tab"
            aria-selected={ativa}
            onClick={() => aoMudar(aba)}
            className={cn(
              "relative h-full px-3 text-[15px] font-medium transition-colors",
              ativa
                ? "text-casca-texto after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-casca-marca"
                : "text-casca-texto-2 hover:text-casca-texto",
            )}
          >
            {t(ROTULO_DA_ABA[aba])}
          </button>
        );
      })}
    </div>
  );
}
