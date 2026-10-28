"use client";
import { useT } from "@/hooks/i18n/useT";
import { numeros } from "@/lib/escale/indicadores/graficos/dados";
import { formatarValor } from "@/lib/escale/indicadores/graficos/formatos";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";

/**
 * Painel de KPI (R14, print 10-046), ainda sem meta: o valor em cima, o arco cinza vazio e "Meta não
 * definida". A 7E acrescenta o arco preenchido, o percentual e "Meta: N".
 */
export function GraficoPainelDeKpi({ resultado }: { resultado: Resultado }) {
  const t = useT();
  const item = numeros(resultado)[0];
  if (!item) return null;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1">
      <p className="text-[16px] font-semibold text-casca-texto">{formatarValor(item.valor, item.unidade)}</p>
      <svg viewBox="0 0 120 64" className="w-[70%] max-w-[220px]" aria-hidden>
        <path d="M 14 60 A 46 46 0 0 1 106 60" fill="none" strokeWidth={28} strokeLinecap="butt" style={{ stroke: "var(--color-casca-raia)" }} />
      </svg>
      <p className="text-[12px] text-casca-suave">{t("Meta não definida")}</p>
    </div>
  );
}
