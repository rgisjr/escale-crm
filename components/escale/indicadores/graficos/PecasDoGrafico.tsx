"use client";
import type { ReactNode } from "react";

import type { Serie } from "@/lib/escale/indicadores/graficos/dados";
import { formatarValor } from "@/lib/escale/indicadores/graficos/formatos";
import type { Unidade } from "@/lib/escale/indicadores/catalogo/tipos";

/** As peças comuns dos gráficos do painel (fork Escale, Fase 7C): legenda, dica e estilos dos eixos. */
export const ESTILO_DO_EIXO = { fontSize: 11, fill: "var(--color-casca-suave)" } as const;

/** Legenda: quadradinho na cor da série + nome; quebra em linhas e, passando de 2, rola (10-021). */
export function Legenda({ itens, className }: { itens: ReadonlyArray<{ nome: string; cor: string }>; className?: string }) {
  return (
    <ul className={`flex max-h-[44px] flex-wrap justify-center gap-x-3 gap-y-1 overflow-y-auto text-[11px] text-casca-suave ${className ?? ""}`}>
      {itens.map((i, k) => (
        <li key={`${i.nome}-${k}`} className="flex max-w-[160px] items-center gap-1.5">
          <span aria-hidden className="size-2.5 shrink-0 rounded-[2px]" style={{ background: i.cor }} />
          <span className="truncate">{i.nome}</span>
        </li>
      ))}
    </ul>
  );
}

export type PayloadDaDica = { value?: number | string | null; name?: string; color?: string; dataKey?: string };

/** A dica (`content` do Tooltip do Recharts, que não exige provedor): caixa branca com o valor de cada série. */
export function DicaDoGrafico({
  active,
  payload,
  label,
  series,
}: {
  active?: boolean;
  payload?: PayloadDaDica[];
  label?: ReactNode;
  series: readonly Serie[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[6px] border border-casca-borda bg-surface px-3 py-2 shadow-casca-painel">
      {label !== undefined && label !== "" ? <p className="mb-1 text-[11px] font-semibold text-casca-texto">{label}</p> : null}
      {payload.map((p, i) => {
        const serie = series.find((s) => s.chave === p.dataKey);
        const unidade: Unidade = serie?.unidade ?? "contagem";
        return (
          <p key={`${p.dataKey}-${i}`} className="flex items-center gap-1.5 text-[12px] font-semibold text-casca-texto">
            <span aria-hidden className="size-2 rounded-full" style={{ background: p.color }} />
            <span className="font-normal text-casca-suave">{serie?.nome ?? p.name}:</span>
            {formatarValor(p.value === null || p.value === undefined ? null : Number(p.value), unidade)}
          </p>
        );
      })}
    </div>
  );
}

/** A pílula do valor da meta, na ponta esquerda da linha tracejada (10-040). */
export function PilulaDaMeta({ x, y, cor, texto }: { x: number; y: number; cor: string; texto: string }) {
  const largura = Math.max(24, texto.length * 7 + 12);
  return (
    <g aria-label={texto}>
      <rect x={x} y={y - 10} width={largura} height={20} rx={10} fill={cor} />
      <text x={x + largura / 2} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="#fff">
        {texto}
      </text>
    </g>
  );
}
