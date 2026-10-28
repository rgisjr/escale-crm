"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { fatias } from "@/lib/escale/indicadores/graficos/dados";
import { formatarValor } from "@/lib/escale/indicadores/graficos/formatos";
import type { OpcoesDoGrafico } from "@/lib/escale/indicadores/graficos/opcoes";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";

import { Legenda } from "./PecasDoGrafico";

type Props = { tipo: "pizza" | "donut"; resultado: Resultado; opcoes: OpcoesDoGrafico; altura: number };

type RotuloProps = { x?: number; y?: number; value?: number; fill?: string; textAnchor?: "start" | "middle" | "end" };

/** Pizza e Donut (prints 10-006, 10-021, 10-047): o valor sempre FORA da fatia, na cor dela. */
export function GraficoDePizza({ tipo, resultado, opcoes, altura }: Props) {
  const { fatias: dados, unidade } = fatias(resultado);
  const legendaEmbaixo = tipo === "pizza";
  const alturaDoGrafico = Math.max(altura - (opcoes.visualizacao.legendas && legendaEmbaixo ? 48 : 0), 40);
  const legenda = opcoes.visualizacao.legendas ? <Legenda itens={dados.map((f) => ({ nome: f.nome, cor: f.cor }))} /> : null;
  return (
    <div className={legendaEmbaixo ? "flex h-full flex-col" : "flex h-full items-center"}>
      <div className="min-w-0 flex-1">
        <ResponsiveContainer width="100%" height={alturaDoGrafico}>
          <PieChart>
            <Pie
              data={dados}
              dataKey="valor"
              nameKey="nome"
              innerRadius={tipo === "donut" ? "50%" : 0}
              outerRadius="70%"
              stroke="#fff"
              strokeWidth={1}
              labelLine={false}
              isAnimationActive={false}
              label={({ x, y, value, fill, textAnchor }: RotuloProps) => (
                <text x={x} y={y} fill={fill} textAnchor={textAnchor} dominantBaseline="central" fontSize={16}>
                  {formatarValor(value ?? 0, unidade)}
                </text>
              )}
            >
              {dados.map((f) => (
                <Cell key={f.nome} fill={f.cor} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatarValor(Number(v), unidade)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {legendaEmbaixo ? legenda : legenda ? <div className="w-[30%] shrink-0 pr-2">{legenda}</div> : null}
    </div>
  );
}
