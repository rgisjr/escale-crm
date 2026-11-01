"use client";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ComponentType } from "react";

import { TRIGGER_LABELS } from "@/app/app/webhooks/_components/labels";
import { ErroDaLista } from "@/components/escale/ui/ErroDaLista";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { AutomationRuleRow } from "@/hooks/webhooks/useAutomationRules";
import { opcaoDoEvento } from "@/lib/escale/automacoes/fluxo/gatilhos";
import { PERIODOS_DOS_INSIGHTS, cartoesDoPainel } from "@/lib/escale/automacoes/insights/regras";
import type {
  CartaoDeNumero,
  FiltroDasExecucoes,
  PeriodoDosInsights,
  ResumoDaAutomacao,
} from "@/lib/escale/automacoes/insights/tipos";
import { CalendarClock, CircleCheck, CircleX, Clock, Play, Workflow } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const ICONES: Record<string, ComponentType<{ size?: number; "aria-hidden"?: boolean }>> = {
  execucoes: Play,
  sucesso: CircleCheck,
  erro: CircleX,
  esperando: Clock,
  ultima: CalendarClock,
};

const CARTOES_DO_PAINEL = 5;

function tituloDoGatilho(regra: AutomationRuleRow, traduzir: (s: string) => string): string {
  const opcao = opcaoDoEvento(regra.trigger_event);
  if (opcao) return traduzir(opcao.titulo);
  const rotulo = (TRIGGER_LABELS as Record<string, string>)[regra.trigger_event];
  return traduzir(rotulo ?? regra.trigger_event);
}

/**
 * O PAINEL DOS INSIGHTS (07-012; fork Escale, Fase 5C; I4, I7, I8, I14): 400 px à esquerda, com o
 * gatilho da automação, o período e os cartões do período. Clicar num número abre a listagem.
 * Diferença da Clint: um gatilho só, então o chip não é seletor.
 */
export function PainelDosInsights({
  regra,
  fuso,
  periodo,
  aoMudarPeriodo,
  consulta,
  aoAbrir,
}: {
  regra: AutomationRuleRow;
  fuso: string;
  periodo: PeriodoDosInsights;
  aoMudarPeriodo: (periodo: PeriodoDosInsights) => void;
  consulta: Pick<UseQueryResult<ResumoDaAutomacao>, "data" | "isPending" | "isError" | "refetch">;
  aoAbrir: (filtro: FiltroDasExecucoes) => void;
}) {
  const t = useT();
  const resumo = consulta.data ?? null;
  const cartoes: CartaoDeNumero[] | null = resumo ? cartoesDoPainel(resumo, fuso) : null;
  const caixa = "rounded-xl bg-casca-raia px-3 py-2.5 text-left";

  return (
    <section className="flex w-[400px] shrink-0 flex-col border-r border-casca-divisoria bg-surface text-[12px]" aria-label={t("Automação")}>
      <header className="flex h-[49px] items-center gap-2 border-b border-casca-divisoria px-6">
        <Workflow size={18} className="text-casca-texto-2" aria-hidden />
        <h2 className="text-[14px] font-medium text-casca-texto">{t("Automação")}</h2>
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
        <div>
          <p className="text-[13px] font-semibold text-casca-texto">{t("Resultados da automação")}</p>
          <p className="mt-1 text-[12px] leading-7 text-casca-suave">
            {t("Quantas vezes ela rodou, quantas deram certo e em qual passo algo falhou. Clique num número para ver as execuções.")}
          </p>
        </div>
        <div className="rounded-md bg-casca-raia px-3 py-2.5">
          <span className="inline-flex rounded bg-casca-marca px-1.5 py-0.5 text-[11px] font-medium text-white">
            {tituloDoGatilho(regra, t)}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-casca-texto">{t("Período")}</span>
          <SeletorDaCasca
            aria-label={t("Período")}
            valor={periodo}
            opcoes={PERIODOS_DOS_INSIGHTS.map((p) => ({ valor: p.valor, rotulo: t(p.rotulo) }))}
            aoMudar={(v) => v && aoMudarPeriodo(v)}
          />
        </div>
        <p className="text-[10px] font-medium tracking-wide text-casca-suave uppercase">{t("Geral")}</p>
        {consulta.isError && !resumo ? (
          <ErroDaLista mensagem={t("Não foi possível carregar os insights.")} aoTentar={() => void consulta.refetch()} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              {(cartoes ?? Array.from({ length: CARTOES_DO_PAINEL }, () => null)).map((c, i) => {
                const chave = c?.chave ?? Object.keys(ICONES)[i]!;
                const Icone = ICONES[chave]!;
                const ultima = chave === "ultima";
                const rotulos = ["Execuções", "Sucesso", "Com erro", "Esperando", "Última execução"];
                const conteudo = (
                  <>
                    <span className="flex items-center gap-1.5 text-[12px] text-casca-texto-2">
                      <Icone size={13} aria-hidden />
                      {t(c?.rotulo ?? rotulos[i]!)}
                    </span>
                    {c ? (
                      <span className={cn("mt-1 block font-bold text-casca-marca", ultima ? "text-[13px]" : "text-[15px]")}>
                        {typeof c.valor === "number" ? c.valor.toLocaleString("pt-BR") : c.valor}
                      </span>
                    ) : (
                      <span data-testid="esqueleto-do-painel" className="mt-1 block h-[18px] w-12 animate-pulse rounded bg-surface" />
                    )}
                  </>
                );
                if (!c || !c.filtro) {
                  return (
                    <div key={chave} className={cn(caixa, ultima && "col-span-2")}>
                      {conteudo}
                    </div>
                  );
                }
                const filtro = c.filtro;
                return (
                  <button
                    key={chave}
                    type="button"
                    onClick={() => aoAbrir(filtro)}
                    className={cn(caixa, "hover:bg-casca-marca-suave")}
                  >
                    {conteudo}
                  </button>
                );
              })}
            </div>
            {resumo && resumo.total === 0 ? (
              <p className="text-[12px] text-casca-suave">{t("Nenhuma execução neste período.")}</p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
