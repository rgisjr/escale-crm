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
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useT } from "@/hooks/i18n/useT";
import { corDaMeta } from "@/lib/escale/indicadores/graficos/cores";
import { dadosCartesianos, linhasDeReferencia } from "@/lib/escale/indicadores/graficos/dados";
import { pilhas100 } from "@/lib/escale/indicadores/graficos/dados-avancados";
import type { Clique } from "@/lib/escale/indicadores/graficos/detalhamento";
import { formatarEixo, formatarValor } from "@/lib/escale/indicadores/graficos/formatos";
import { metaDoIndicador } from "@/lib/escale/indicadores/graficos/metas";
import type { OpcoesDoGrafico } from "@/lib/escale/indicadores/graficos/opcoes";
import type { TipoPrincipal } from "@/lib/escale/indicadores/graficos/tipos";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import type { Pergunta } from "@/lib/escale/indicadores/pergunta";

import { DicaDoGrafico, ESTILO_DO_EIXO, Legenda, PilulaDaMeta, type PayloadDaDica } from "./PecasDoGrafico";

type Props = {
  tipo: Extract<TipoPrincipal, "linha" | "area" | "barra" | "barra_empilhada"> | "barra_100";
  resultado: Resultado;
  pergunta: Pergunta;
  opcoes: OpcoesDoGrafico;
  altura: number;
  /** Fase 7E (T19): o clique num ponto, barra ou série abre o detalhamento. */
  aoClicarNoPonto?: (clique: Clique) => void;
};

const ALTURA_DA_LEGENDA = 48;

/** Linha, Área, Barra e Barra Empilhada (prints 10-006, 10-021, 10-067). */
export function GraficoCartesiano({ tipo, resultado, pergunta, opcoes, altura, aoClicarNoPonto }: Props) {
  const t = useT();
  const idDoDegrade = useId().replace(/:/g, "");
  const granularidade = resultado.avisos.includes("granularidade_ajustada") ? "dia" : pergunta.tempo?.granularidade;
  const base =
    tipo === "barra_100"
      ? pilhas100(resultado, opcoes)
      : dadosCartesianos(resultado, granularidade, tipo, { opcoes, t });
  const empilhada = tipo === "barra_empilhada" || tipo === "barra_100";
  // O total em cima da pilha (10-006): a soma das séries de cada ponto.
  const dados =
    tipo === "barra_empilhada"
      ? { ...base, pontos: base.pontos.map((p) => ({ ...p, total: base.series.reduce((n, s) => n + Number(p[s.chave] ?? 0), 0) })) }
      : base;
  const { valores, legendas, grade, linhaDeMedia, linhaDeMediana } = opcoes.visualizacao;
  const unidade = dados.series[0]?.unidade ?? "contagem";
  const alturaDoGrafico = Math.max(altura - (legendas ? ALTURA_DA_LEGENDA : 0), 40);
  const formatoDoRotulo = (v: unknown) => formatarValor(v === null || v === undefined ? null : Number(v), unidade);
  // Fase 7E (T11): uma linha tracejada verde por meta visível.
  const metas = resultado.colunas
    .filter((c) => c.papel === "indicador")
    .map((c, i) => ({ i, meta: tipo === "barra_100" ? null : metaDoIndicador(opcoes, c.chave) }))
    .filter((m): m is { i: number; meta: { valor: number; visivel: boolean } } => m.meta !== null && m.meta.visivel);
  const clicar = (indice: number | undefined, serie?: string) => {
    const ponto: Record<string, string | number | null> | undefined = indice === undefined ? undefined : dados.pontos[indice];
    if (!aoClicarNoPonto || !ponto) return;
    aoClicarNoPonto({
      rotulo: String(ponto.rotulo ?? ""),
      ...(typeof ponto.t === "string" ? { t: ponto.t } : {}),
      ...(serie ? { serie } : {}),
    });
  };

  const referencias = linhasDeReferencia(dados);
  const linha = (y: number | null, rotulo: string) =>
    y === null ? null : (
      <ReferenceLine
        y={y}
        stroke="var(--color-casca-suave)"
        strokeDasharray="4 4"
        label={{ value: `${rotulo}: ${formatarValor(y, unidade)}`, position: "right", fontSize: 10, fill: "var(--color-casca-suave)" }}
      />
    );
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
      {metas.map(({ i, meta }) => (
        <ReferenceLine
          key={`meta-${i}`}
          y={meta.valor}
          stroke={corDaMeta(i)}
          strokeDasharray="2 4"
          strokeWidth={2}
          label={(p: { viewBox?: { x?: number; y?: number } }) => (
            <PilulaDaMeta x={(p.viewBox?.x ?? 0) + 2} y={p.viewBox?.y ?? 0} cor={corDaMeta(i)} texto={formatarValor(meta.valor, "contagem")} />
          )}
        />
      ))}
      {linhaDeMedia ? linha(referencias.media, t("Média")) : null}
      {linhaDeMediana ? linha(referencias.mediana, t("Mediana")) : null}
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
      <LineChart
        data={dados.pontos}
        margin={{ top: 16, right: 12, left: 0, bottom: 0 }}
        onClick={(e) => clicar(typeof e.activeTooltipIndex === "number" ? e.activeTooltipIndex : Number(e.activeTooltipIndex))}
        style={aoClicarNoPonto ? { cursor: "pointer" } : undefined}
      >
        {eixos}
        {dados.series.map((s) => (
          <Line
            key={s.chave}
            dataKey={s.chave}
            name={s.nome}
            type="monotone"
            stroke={s.cor}
            strokeWidth={2.5}
            {...(s.tracejada ? { strokeDasharray: "5 4" } : {})}
            dot={{ r: s.tracejada ? 3 : 4, fill: s.cor, strokeWidth: 0 }}
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
      <AreaChart
        data={dados.pontos}
        margin={{ top: 16, right: 12, left: 0, bottom: 0 }}
        onClick={(e) => clicar(typeof e.activeTooltipIndex === "number" ? e.activeTooltipIndex : Number(e.activeTooltipIndex))}
        style={aoClicarNoPonto ? { cursor: "pointer" } : undefined}
      >
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
            {...(s.tracejada ? { strokeDasharray: "5 4" } : {})}
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
    grafico = (
      <BarChart data={dados.pontos} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
        {eixos}
        {dados.series.map((s, i) => (
          <Bar
            key={s.chave}
            dataKey={s.chave}
            name={s.nome}
            fill={s.cor}
            {...(empilhada && !s.tracejada ? { stackId: "a" } : {})}
            {...(s.tracejada ? { fillOpacity: 0.5 } : {})}
            radius={empilhada ? 0 : [2, 2, 0, 0]}
            maxBarSize={96}
            isAnimationActive={false}
            {...(aoClicarNoPonto ? { cursor: "pointer" } : {})}
            onClick={(_d, indice) => clicar(indice, dados.series.length > 1 ? s.nome : undefined)}
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
      {legendas ? (
        <Legenda
          itens={[...dados.series, ...(metas.length ? [{ nome: t("Metas"), cor: corDaMeta(0) }] : [])]}
          className="mt-1"
        />
      ) : null}
    </div>
  );
}
