"use client";
import { useT } from "@/hooks/i18n/useT";
import { cn } from "@/lib/utils";

export type AbaDoFluxo = "editor" | "insights";

/**
 * O CONTROLE EDITOR / INSIGHTS (07-013, C2): segmentado, 28 px. "Insights" nasce
 * desabilitada; a 5C a liga (`insightsDisponivel`).
 */
export function AbasDoFluxo({
  aba,
  aoMudar,
  insightsDisponivel,
}: {
  aba: AbaDoFluxo;
  aoMudar: (aba: AbaDoFluxo) => void;
  insightsDisponivel: boolean;
}) {
  const t = useT();
  const abas: { valor: AbaDoFluxo; rotulo: string; desabilitada: boolean }[] = [
    { valor: "editor", rotulo: t("Editor"), desabilitada: false },
    { valor: "insights", rotulo: t("Insights"), desabilitada: !insightsDisponivel },
  ];
  return (
    <div role="tablist" className="inline-flex rounded-lg bg-casca-raia p-0.5">
      {abas.map((a) => {
        const ativa = a.valor === aba;
        return (
          <button
            key={a.valor}
            type="button"
            role="tab"
            aria-selected={ativa}
            disabled={a.desabilitada}
            onClick={() => aoMudar(a.valor)}
            className={cn(
              "h-7 rounded-md px-3 text-[12px]",
              ativa ? "bg-surface font-medium text-casca-texto shadow-sm" : "text-casca-suave",
              a.desabilitada && "cursor-not-allowed opacity-60",
            )}
          >
            {a.rotulo}
          </button>
        );
      })}
    </div>
  );
}
