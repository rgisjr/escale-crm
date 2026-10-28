"use client";
import { useT } from "@/hooks/i18n/useT";
import { escalaDoHeatmap } from "@/lib/escale/indicadores/graficos/cores";
import { celulasDoHeatmap } from "@/lib/escale/indicadores/graficos/dados-avancados";
import type { Clique } from "@/lib/escale/indicadores/graficos/detalhamento";
import { formatarValor } from "@/lib/escale/indicadores/graficos/formatos";
import type { OpcoesDoGrafico } from "@/lib/escale/indicadores/graficos/opcoes";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";

/** Dom … Sáb; a chave é o `isodow` do Postgres (1 = segunda … 7 = domingo). */
const DIAS = [
  { dsem: 7, rotulo: "Dom" },
  { dsem: 1, rotulo: "Seg" },
  { dsem: 2, rotulo: "Ter" },
  { dsem: 3, rotulo: "Qua" },
  { dsem: 4, rotulo: "Qui" },
  { dsem: 5, rotulo: "Sex" },
  { dsem: 6, rotulo: "Sáb" },
] as const;

/** Heatmap dia × hora (T18, provisório): grade de células na escala da marca, legenda e máximo. */
export function GraficoHeatmap({
  resultado,
  opcoes,
  aoClicarNoPonto,
}: {
  resultado: Resultado;
  opcoes: OpcoesDoGrafico;
  aoClicarNoPonto?: (clique: Clique) => void;
}) {
  const t = useT();
  if (!resultado.colunas.some((c) => c.papel === "tempo") || resultado.linhas.length === 0) {
    return <p className="grid h-full place-items-center text-[13px] text-casca-suave">{t("Sem dados")}</p>;
  }
  const { celulas, maximo, horas } = celulasDoHeatmap(resultado, opcoes);
  const unidade = resultado.colunas.find((c) => c.papel === "indicador")?.unidade ?? "contagem";
  const porChave = new Map(celulas.map((c) => [`${c.dsem}|${c.hora}`, c]));
  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <p className="text-[10px] text-casca-suave">{t("Hora do dia")}</p>
      <div className="grid min-h-0 flex-1 gap-[2px]" style={{ gridTemplateColumns: `36px repeat(${horas.length}, minmax(0, 1fr))` }}>
        <span aria-hidden />
        {horas.map((h) => (
          <span key={h} className="text-center text-[10px] text-casca-suave">
            {String(h).padStart(2, "0")}h
          </span>
        ))}
        {DIAS.flatMap((d) => [
          <span key={`d${d.dsem}`} className="self-center text-[11px] text-casca-suave">
            {t(d.rotulo)}
          </span>,
          ...horas.map((h) => {
            const c = porChave.get(`${d.dsem}|${h}`);
            const valor = c?.valor ?? 0;
            return (
              <button
                key={`${d.dsem}-${h}`}
                type="button"
                title={`${t(d.rotulo)}, ${h}h: ${formatarValor(valor, unidade)}`}
                aria-label={`${t(d.rotulo)}, ${h}h: ${formatarValor(valor, unidade)}`}
                disabled={!aoClicarNoPonto}
                onClick={() => aoClicarNoPonto?.({ dsem: d.dsem, hora: h })}
                className={`aspect-square rounded-[2px] ${aoClicarNoPonto ? "cursor-pointer" : ""}`}
                style={{ background: escalaDoHeatmap(c?.nivel ?? 0) }}
              />
            );
          }),
        ])}
      </div>
      <div className="flex items-center justify-between text-[11px] text-casca-suave">
        <span className="flex items-center gap-1">
          {t("menos")}
          {([0, 1, 2, 3, 4] as const).map((n) => (
            <span key={n} aria-hidden className="size-3 rounded-[2px]" style={{ background: escalaDoHeatmap(n) }} />
          ))}
          {t("mais")}
        </span>
        <span>{t("Máx: {valor}").replace("{valor}", formatarValor(maximo, unidade))}</span>
      </div>
    </div>
  );
}
