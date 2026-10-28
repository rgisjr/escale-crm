"use client";
import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { dadosCartesianos } from "@/lib/escale/indicadores/graficos/dados";
import { formatarEixo, formatarValor } from "@/lib/escale/indicadores/graficos/formatos";
import type { OpcoesDoGrafico } from "@/lib/escale/indicadores/graficos/opcoes";
import type { TipoPrincipal } from "@/lib/escale/indicadores/graficos/tipos";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import type { Pergunta } from "@/lib/escale/indicadores/pergunta";

import { DicaDoGrafico, ESTILO_DO_EIXO, Legenda, type PayloadDaDica } from "./PecasDoGrafico";

type Props = {
  tipo: Extract<TipoPrincipal, "linha" | "area" | "barra" | "barra_empilhada">;
  resultado: Resultado;
  pergunta: Pergunta;
  opcoes: OpcoesDoGrafico;
  altura: number;
};

const ALTURA_DA_LEGENDA = 48;

/** Linha, Área, Barra e Barra Empilhada (prints 10-006, 10-021, 10-067). */
export function GraficoCartesiano({ tipo, resultado, pergunta, opcoes, altura }: Props) {
  const idDoDegrade = useId().replace(/:/g, "");
  const granularidade = resultado.avisos.includes("granularidade_ajustada") ? "dia" : pergunta.tempo?.granularidade;
  const base = dadosCartesianos(resultado, granularidade, tipo);
  // O total em cima da pilha (10-006): a soma das séries de cada ponto.
  const dados =
    tipo === "barra_empilhada"
      ? { ...base, pontos: base.pontos.map((p) => ({ ...p, total: base.series.reduce((n, s) => n + Number(p[s.chave] ?? 0), 0) })) }
      : base;
  const { valores, legendas, grade } = opcoes.visualizacao;
  const unidade = dados.series[0]?.unidade ?? "contagem";
  const alturaDoGrafico = Math.max(altura - (legendas ? ALTURA_DA_LEGENDA : 0), 40);
  const formatoDoRotulo = (v: unknown) => formatarValor(v === null || v === undefined ? null : Number(v), unidade);

  const eixos = (
    <>
      {grade ? (
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-casca-borda)" />
      ) : null}
      <XAxis dataKey="rotulo" axisLine={false} tickLine={false} tick={ESTILO_DO_EIXO} interval="preserveStartEnd" minTickGap={16} />
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={ESTILO_DO_EIXO}
        width={48}
        tickFormatter={(v: number) => formatarEixo(v, unidade)}
      />
      <Tooltip
        cursor={{ fill: "var(--color-casca-raia)" }}
        content={(p) => (
          <DicaDoGrafico
            active={p.active}
            payload={p.payload as unknown as PayloadDaDica[]}
            label={p.label}
            series={dados.series}
          />
        )}
      />
    </>
  );
  let grafico;
  if (tipo === "linha") {
    grafico = (
      <LineChart data={dados.pontos} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
        {eixos}
        {dados.series.map((s) => (
          <Line
            key={s.chave}
            dataKey={s.chave}
            name={s.nome}
            type="monotone"
            stroke={s.cor}
            strokeWidth={2.5}
            dot={{ r: 4, fill: s.cor, strokeWidth: 0 }}
            connectNulls={false}
            isAnimationActive={false}
          >
            {valores ? <LabelList dataKey={s.chave} position="top" fontSize={10} fill={s.cor} formatter={formatoDoRotulo} /> : null}
          </Line>
        ))}
      </LineChart>
    );
  } else if (tipo === "area") {
    grafico = (
      <AreaChart data={dados.pontos} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
        <defs>
          {dados.series.map((s) => (
            <linearGradient key={s.chave} id={`${idDoDegrade}-${s.chave}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: s.cor, stopOpacity: 0.6 }} />
              <stop offset="100%" style={{ stopColor: s.cor, stopOpacity: 0.05 }} />
            </linearGradient>
          ))}
        </defs>
        {eixos}
        {dados.series.map((s) => (
          <Area
            key={s.chave}
            dataKey={s.chave}
            name={s.nome}
            type="monotone"
            stroke={s.cor}
            strokeWidth={2.5}
            fill={`url(#${idDoDegrade}-${s.chave})`}
            connectNulls={false}
            isAnimationActive={false}
          >
            {valores ? <LabelList dataKey={s.chave} position="top" fontSize={10} fill={s.cor} formatter={formatoDoRotulo} /> : null}
          </Area>
        ))}
      </AreaChart>
    );
  } else {
    const empilhada = tipo === "barra_empilhada";
    grafico = (
      <BarChart data={dados.pontos} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
        {eixos}
        {dados.series.map((s, i) => (
          <Bar
            key={s.chave}
            dataKey={s.chave}
            name={s.nome}
            fill={s.cor}
            {...(empilhada ? { stackId: "a" } : {})}
            radius={empilhada ? 0 : [2, 2, 0, 0]}
            maxBarSize={96}
            isAnimationActive={false}
          >
            {valores
              ? empilhada
                ? <LabelList dataKey={s.chave} position="center" fontSize={10} fill="var(--color-casca-suave)" formatter={formatoDoRotulo} />
                : <LabelList dataKey={s.chave} position="top" fontSize={10} fill={s.cor} formatter={formatoDoRotulo} />
              : null}
            {empilhada && valores && i === dados.series.length - 1 ? (
              <LabelList dataKey="total" position="top" fontSize={10} fill="var(--color-casca-texto)" formatter={formatoDoRotulo} />
            ) : null}
          </Bar>
        ))}
      </BarChart>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ResponsiveContainer width="100%" height={alturaDoGrafico}>
        {grafico}
      </ResponsiveContainer>
      {legendas ? <Legenda itens={dados.series} className="mt-1" /> : null}
    </div>
  );
}
