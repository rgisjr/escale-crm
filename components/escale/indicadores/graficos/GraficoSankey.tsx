"use client";
import { ResponsiveContainer, Sankey, Tooltip } from "recharts";

import { useT } from "@/hooks/i18n/useT";
import { corDaSerie } from "@/lib/escale/indicadores/graficos/cores";
import { fluxoDoSankey } from "@/lib/escale/indicadores/graficos/dados-avancados";
import { formatarValor } from "@/lib/escale/indicadores/graficos/formatos";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";

type NoProps = { x: number; y: number; width: number; height: number; index: number; payload: { name: string } };

function NoDoSankey({ x, y, width, height, index, payload }: NoProps) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={corDaSerie(index)} />
      <text x={x + width + 6} y={y + height / 2} dominantBaseline="central" fontSize={11} fill="var(--color-casca-texto)">
        {payload.name}
      </text>
    </g>
  );
}

/** Sankey de fluxo (T16, provisório): 2 variáveis, nós à esquerda e à direita, links pelo 1º indicador. */
export function GraficoSankey({ resultado, altura }: { resultado: Resultado; altura: number }) {
  const t = useT();
  const fluxo = fluxoDoSankey(resultado);
  if (!fluxo) {
    return (
      <p className="grid h-full place-items-center text-center text-[13px] text-casca-suave">
        {t("Adicione pelo menos 2 variáveis para ver o fluxo")}
      </p>
    );
  }
  if (fluxo.links.length === 0) {
    return <p className="grid h-full place-items-center text-[13px] text-casca-suave">{t("Sem dados no período")}</p>;
  }
  const unidade = resultado.colunas.find((c) => c.papel === "indicador")?.unidade ?? "contagem";
  return (
    <div className="flex h-full flex-col">
      <ResponsiveContainer width="100%" height={Math.max(altura - 20, 40)}>
        <Sankey
          data={fluxo}
          nodePadding={24}
          nodeWidth={12}
          linkCurvature={0.5}
          margin={{ top: 16, right: 96, bottom: 16, left: 16 }}
          node={(p: unknown) => <NoDoSankey {...(p as NoProps)} />}
          link={{ stroke: "var(--color-casca-marca)", strokeOpacity: 0.35 }}
        >
          <Tooltip formatter={(v) => formatarValor(Number(v), unidade)} />
        </Sankey>
      </ResponsiveContainer>
      <p className="text-center text-[11px] text-casca-suave">
        {t("{total} no período · {levels} níveis")
          .replace("{total}", formatarValor(fluxo.total, unidade))
          .replace("{levels}", "2")}
      </p>
    </div>
  );
}
