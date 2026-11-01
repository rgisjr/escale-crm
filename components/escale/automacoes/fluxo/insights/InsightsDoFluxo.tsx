"use client";
import { useMemo, useState } from "react";

import { useResumoDaAutomacao } from "@/hooks/escale/useInsightsDaAutomacao";
import { useT } from "@/hooks/i18n/useT";
import type { AutomationRuleRow } from "@/hooks/webhooks/useAutomationRules";
import { desenhoDaRegra } from "@/lib/automation/desenho-da-regra";
import { regraGravadaDe } from "@/lib/escale/automacoes/fluxo/estado";
import { agrupar } from "@/lib/escale/automacoes/fluxo/grupos";
import { organizarNaHorizontal } from "@/lib/escale/automacoes/fluxo/layout";
import { PERIODO_PADRAO, acoesDeCadaPasso } from "@/lib/escale/automacoes/insights/regras";
import type { FiltroDasExecucoes, PeriodoDosInsights } from "@/lib/escale/automacoes/insights/tipos";
import { ChevronLeft, ChevronRight } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CanvasDosInsights } from "./CanvasDosInsights";
import { InsightsDoNoProvider } from "./contexto";
import { JanelaDeExecucoes } from "./JanelaDeExecucoes";
import { PainelDosInsights } from "./PainelDosInsights";

/**
 * A ABA INSIGHTS (07-011, 07-012; fork Escale, Fase 5C): o painel com os números do período à
 * esquerda e a automação como está gravada, só para leitura, no resto. O rascunho do editor fica
 * guardado no `useFluxo` (que não é desmontado); aqui aparece só a pílula avisando que ele não
 * entra nos números (I2).
 */
export function InsightsDoFluxo({ regra, fuso, sujo }: { regra: AutomationRuleRow; fuso: string; sujo: boolean }) {
  const t = useT();
  const [periodo, setPeriodo] = useState<PeriodoDosInsights>(PERIODO_PADRAO);
  const [painelAberto, setPainelAberto] = useState(true);
  const [listagem, setListagem] = useState<FiltroDasExecucoes | null>(null);
  const consulta = useResumoDaAutomacao(regra.id, periodo);

  const desenho = useMemo(() => organizarNaHorizontal(agrupar(desenhoDaRegra(regraGravadaDe(regra)))), [regra]);
  const acoesDosPassos = useMemo(() => acoesDeCadaPasso(desenho), [desenho]);

  return (
    <div data-escale-fluxo-insights className="relative flex h-full min-h-0 flex-1">
      {painelAberto ? (
        <PainelDosInsights
          regra={regra}
          fuso={fuso}
          periodo={periodo}
          aoMudarPeriodo={setPeriodo}
          consulta={consulta}
          aoAbrir={setListagem}
        />
      ) : null}
      <button
        type="button"
        aria-label={painelAberto ? t("Recolher painel") : t("Abrir painel")}
        onClick={() => setPainelAberto((a) => !a)}
        className={cn(
          "absolute top-1/2 z-20 grid size-[33px] -translate-y-1/2 place-items-center rounded-full bg-casca-divisoria text-casca-texto-2",
          painelAberto ? "left-[400px] -translate-x-1/2" : "left-4",
        )}
      >
        {painelAberto ? <ChevronLeft size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
      </button>
      {sujo ? (
        <p className="absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-casca-divisoria bg-surface px-3 py-1.5 text-[12px] font-semibold text-casca-texto shadow-sm">
          {t("Você está vendo a versão salva. As alterações não salvas não aparecem aqui.")}
        </p>
      ) : null}
      <InsightsDoNoProvider
        valor={{
          resumo: consulta.data ?? null,
          carregando: consulta.isPending,
          erro: consulta.isError && !consulta.data,
          acoesDosPassos,
          aoAbrir: setListagem,
        }}
      >
        <CanvasDosInsights desenho={desenho} evento={regra.trigger_event} />
      </InsightsDoNoProvider>
      {listagem ? (
        <JanelaDeExecucoes
          regra={regra}
          fuso={fuso}
          periodo={periodo}
          filtroInicial={listagem}
          aoFechar={() => setListagem(null)}
        />
      ) : null}
    </div>
  );
}
