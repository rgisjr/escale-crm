"use client";
import { useT } from "@/hooks/i18n/useT";
import { numeroAvancado } from "@/lib/escale/indicadores/graficos/dados-avancados";
import type { Clique } from "@/lib/escale/indicadores/graficos/detalhamento";
import { formatarPercentual, formatarValor, formatarVariacao } from "@/lib/escale/indicadores/graficos/formatos";
import type { OpcoesDoGrafico } from "@/lib/escale/indicadores/graficos/opcoes";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";

const SELO = {
  saudavel: { texto: "Saudável", classe: "bg-[#DCFCE7] text-[#15803D]" },
  alerta: { texto: "Alerta", classe: "bg-[#FEF3C7] text-casca-atencao" },
  critico: { texto: "Crítico", classe: "bg-[#FEE2E2] text-casca-alerta" },
} as const;

/** Número avançado (T14, provisório): valor, variação sobre o período anterior, meta, faixa de saúde e projeção. */
export function GraficoNumeroAvancado({
  resultado,
  opcoes,
  aoClicarNoPonto,
}: {
  resultado: Resultado;
  opcoes: OpcoesDoGrafico;
  aoClicarNoPonto?: (clique: Clique) => void;
}) {
  const t = useT();
  const n = numeroAvancado(resultado, opcoes);
  const comparando = Boolean(resultado.comparacao);
  const faixa = n.faixa ? SELO[n.faixa] : null;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
      <p
        className={`text-[28px] leading-tight font-semibold text-casca-texto ${aoClicarNoPonto ? "cursor-pointer" : ""}`}
        {...(aoClicarNoPonto ? { onClick: () => aoClicarNoPonto({}), role: "button" } : {})}
      >
        {formatarValor(n.valor, n.unidade)}
      </p>
      {comparando ? (
        n.variacao === null ? (
          <p className="text-[12px] text-casca-suave">{t("Sem dados no período anterior")}</p>
        ) : (
          <p className="text-[13px]">
            <span className={`font-semibold ${n.variacao >= 0 ? "text-casca-data-aplicada" : "text-casca-alerta"}`}>
              {n.variacao >= 0 ? "▲" : "▼"} {formatarVariacao(n.variacao)}
            </span>{" "}
            <span className="text-[12px] text-casca-suave">{t("vs. período anterior")}</span>
          </p>
        )
      ) : null}
      {n.meta !== null ? (
        <p className="text-[12px] text-casca-suave">
          {t("Meta:")} {formatarValor(n.meta, n.unidade)}
          {n.pctDaMeta !== null ? ` · ${formatarPercentual(n.pctDaMeta, 0)} ${t("da meta")}` : ""}
        </p>
      ) : null}
      {faixa ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${faixa.classe}`}>{t(faixa.texto)}</span> : null}
      {n.projecao !== null ? (
        <p className="text-[12px] text-casca-suave">
          {t("Projeção:")} {formatarValor(n.projecao, n.unidade)}
        </p>
      ) : null}
    </div>
  );
}
