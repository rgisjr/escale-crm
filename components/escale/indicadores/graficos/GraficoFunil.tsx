"use client";
import { etapasDoFunil } from "@/lib/escale/indicadores/graficos/dados";
import type { Clique } from "@/lib/escale/indicadores/graficos/detalhamento";
import { formatarValor } from "@/lib/escale/indicadores/graficos/formatos";
import type { OpcoesDoGrafico } from "@/lib/escale/indicadores/graficos/opcoes";
import { temOrdemNatural } from "@/lib/escale/indicadores/graficos/ordem-natural";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import type { Pergunta } from "@/lib/escale/indicadores/pergunta";

const ALTURA_MAXIMA_DA_ETAPA = 46;
const BASE_DA_ULTIMA = 0.7;

/**
 * Funil em SVG próprio (R15, print 10-043): nomes à esquerda, trapézios com o valor dentro e o
 * percentual à direita (o cálculo vem de `opcoes.funil`, D17). A 7E traz as opções de 10-042/10-044: uma cor por etapa,
 * casas decimais, maior queda, meta de conversão, destaque, formato compacto e gargalo.
 */
export function GraficoFunil({
  resultado,
  altura,
  opcoes,
  pergunta,
  aoClicarNoPonto,
}: {
  resultado: Resultado;
  altura: number;
  opcoes?: OpcoesDoGrafico;
  pergunta?: Pergunta;
  aoClicarNoPonto?: (clique: Clique) => void;
}) {
  const etapas = etapasDoFunil(resultado, opcoes?.funil, temOrdemNatural(pergunta?.variaveis[0]));
  if (etapas.length === 0) return null;
  const maior = Math.max(...etapas.map((e) => e.valor), 1);
  const alturaDaEtapa = Math.min(ALTURA_MAXIMA_DA_ETAPA, altura / etapas.length);
  return (
    <ul className="flex h-full flex-col justify-center" aria-label="Funil">
      {etapas.map((e, i) => {
        const topo = e.valor / maior;
        const proxima = etapas[i + 1];
        const gargalo = opcoes?.funil.gargalo ?? false;
        const base = gargalo || !proxima ? topo * BASE_DA_ULTIMA : proxima.valor / maior;
        const folgaTopo = (1 - topo) * 50;
        const folgaBase = (1 - base) * 50;
        return (
          <li
            key={`${e.nome}-${i}`}
            className={`grid grid-cols-[30%_1fr_48px] items-center gap-2 ${aoClicarNoPonto ? "cursor-pointer" : ""}`}
            style={{ height: alturaDaEtapa - (gargalo ? 4 : 0) }}
            {...(aoClicarNoPonto ? { onClick: () => aoClicarNoPonto({ rotulo: e.nome }) } : {})}
          >
            <span className="truncate text-right text-[12px] text-casca-texto" title={e.nome}>
              {e.nome}
            </span>
            <div className="relative h-full">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
                <polygon
                  points={`${folgaTopo},0 ${100 - folgaTopo},0 ${100 - folgaBase},100 ${folgaBase},100`}
                  style={{ fill: e.pior ? "var(--color-casca-alerta)" : e.cor }}
                />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-[12px] font-semibold text-white">
                {opcoes?.funil.destaque === "percentual" ? (e.rotuloDoPercentual ?? "") : (e.rotuloDoValor ?? formatarValor(e.valor, "contagem"))}
              </span>
            </div>
            <span className={`text-[12px] ${e.abaixo ? "text-casca-alerta" : "text-casca-texto"}`}>
              {opcoes?.funil.destaque === "percentual" ? (e.rotuloDoValor ?? formatarValor(e.valor, "contagem")) : (e.rotuloDoPercentual ?? formatarValor(Math.round(e.percentual), "percentual"))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
