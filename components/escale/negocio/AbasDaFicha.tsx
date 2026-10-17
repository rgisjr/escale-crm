"use client";
import { useT } from "@/hooks/i18n/useT";
import { ABAS_DO_NEGOCIO, ROTULO_DA_ABA, type AbaDoNegocio } from "@/lib/escale/negocio/regras";
import { cn } from "@/lib/utils";

/**
 * AS SETE ABAS DA FICHA (fork Escale, Fase 1G, C2; prints 01 a 07): 41px de
 * altura, 13px, 14px de cada lado; a ativa na cor da marca com sublinhado de
 * 3px. Não usa a `AbasDaCasca` (a da janela da origem tem 8px de lado e a ativa
 * em `casca-texto`).
 */
export function AbasDaFicha({
  valor,
  aoMudar,
}: {
  valor: AbaDoNegocio;
  aoMudar: (aba: AbaDoNegocio) => void;
}) {
  const t = useT();
  return (
    <div
      role="tablist"
      aria-label={t("Abas do negócio")}
      className="flex h-[41px] shrink-0 border-b border-casca-borda px-4"
    >
      {ABAS_DO_NEGOCIO.map((aba) => {
        const ativa = aba === valor;
        return (
          <button
            key={aba}
            type="button"
            role="tab"
            id={`aba-${aba}`}
            aria-selected={ativa}
            aria-controls="painel-da-aba"
            onClick={() => aoMudar(aba)}
            className={cn(
              "relative h-full px-3.5 text-[13px] transition-colors",
              ativa
                ? "text-casca-marca after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-full after:bg-casca-marca"
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
