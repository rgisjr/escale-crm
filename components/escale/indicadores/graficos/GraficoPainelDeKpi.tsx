"use client";
import { useT } from "@/hooks/i18n/useT";
import { corDaMeta } from "@/lib/escale/indicadores/graficos/cores";
import { numeros } from "@/lib/escale/indicadores/graficos/dados";
import type { Clique } from "@/lib/escale/indicadores/graficos/detalhamento";
import { formatarPercentual, formatarValor } from "@/lib/escale/indicadores/graficos/formatos";
import { atingiu, metaDoIndicador, percentualDaMeta } from "@/lib/escale/indicadores/graficos/metas";
import type { OpcoesDoGrafico } from "@/lib/escale/indicadores/graficos/opcoes";
import { projetar } from "@/lib/escale/indicadores/graficos/projecao";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import { CircleCheck, CircleX, Target } from "@/lib/ui/icons-da-casca";

const RAIO = 46;
const CENTRO = { x: 60, y: 60 };

/** O ponto do arco de meia-volta na fração `p` (0 = esquerda, 1 = direita). */
const pontoDoArco = (p: number) => ({
  x: CENTRO.x - RAIO * Math.cos(Math.PI * p),
  y: CENTRO.y - RAIO * Math.sin(Math.PI * p),
});

/**
 * Painel de KPI (R14, 10-046): o valor em cima, o arco de 180° com o preenchimento até o percentual da
 * meta, a pílula verde da meta na ponta, o percentual no centro e "Meta: N ✓". Sem meta, "Meta não definida".
 */
export function GraficoPainelDeKpi({
  resultado,
  opcoes,
  aoClicarNoPonto,
}: {
  resultado: Resultado;
  opcoes?: OpcoesDoGrafico;
  aoClicarNoPonto?: (clique: Clique) => void;
}) {
  const t = useT();
  const item = numeros(resultado)[0];
  const indicador = resultado.colunas.find((c) => c.papel === "indicador");
  if (!item || !indicador) return null;
  const meta = opcoes ? metaDoIndicador(opcoes, indicador.chave) : null;
  const pct = meta ? percentualDaMeta(item.valor, meta.valor) : null;
  const cheio = pct === null ? 0 : Math.min(100, Math.max(0, pct)) / 100;
  const fim = pontoDoArco(cheio);
  const ponta = pontoDoArco(1);
  const modo = opcoes?.visualizacao.projecaoDiasUteis ? "dias_uteis" : opcoes?.visualizacao.projecaoNormal ? "normal" : null;
  const projecao = modo ? projetar(resultado, { chave: indicador.chave, unidade: item.unidade }, modo)?.total : undefined;
  const conteudo = (
    <>
      <p className="text-[16px] font-semibold text-casca-texto">{formatarValor(item.valor, item.unidade)}</p>
      <div className="relative w-[70%] max-w-[220px]">
        <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
          <path d="M 14 60 A 46 46 0 0 1 106 60" fill="none" strokeWidth={28} strokeLinecap="butt" style={{ stroke: "var(--color-casca-raia)" }} />
          {cheio > 0 ? (
            <path
              d={`M 14 60 A ${RAIO} ${RAIO} 0 0 1 ${fim.x.toFixed(2)} ${fim.y.toFixed(2)}`}
              fill="none"
              strokeWidth={28}
              strokeLinecap="butt"
              style={{ stroke: "var(--color-casca-marca)" }}
            />
          ) : null}
          {meta ? <path d={`M ${ponta.x - 14} 60 L ${ponta.x + 14} 60`} strokeWidth={6} style={{ stroke: corDaMeta(0) }} /> : null}
          {meta ? (
            <g aria-label={formatarValor(meta.valor, item.unidade)}>
              <rect x={ponta.x - 4} y={64} width={Math.max(18, String(meta.valor).length * 6 + 8)} height={6} rx={3} fill={corDaMeta(0)} />
            </g>
          ) : null}
        </svg>
        {pct !== null ? (
          <span className="absolute inset-x-0 bottom-[8%] text-center text-[26px] leading-none font-semibold text-casca-texto">
            {formatarPercentual(pct, 0)}
          </span>
        ) : null}
      </div>
      {meta ? (
        <p className="flex items-center gap-1 text-[12px] text-casca-suave">
          <Target size={12} aria-hidden />
          {t("Meta:")} <span className="font-semibold text-casca-texto">{formatarValor(meta.valor, item.unidade)}</span>
          {atingiu(item.valor, meta.valor) ? (
            <CircleCheck size={12} aria-label={t("Meta atingida")} style={{ color: corDaMeta(0) }} />
          ) : (
            <CircleX size={12} aria-label={t("Meta não atingida")} className="text-casca-alerta" />
          )}
        </p>
      ) : (
        <p className="text-[12px] text-casca-suave">{t("Meta não definida")}</p>
      )}
      {projecao !== undefined && projecao !== null ? (
        <p className="text-[12px] text-casca-suave">
          {t("Projeção:")} {formatarValor(projecao, item.unidade)}
        </p>
      ) : null}
    </>
  );
  const classe = "flex h-full flex-col items-center justify-center gap-1";
  return aoClicarNoPonto ? (
    <button type="button" onClick={() => aoClicarNoPonto({})} className={`${classe} w-full cursor-pointer`}>
      {conteudo}
    </button>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}
