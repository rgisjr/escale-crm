"use client";
import { useEffect, useState, type ReactNode } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { tempoDesde } from "@/lib/escale/campanhas/apresentacao";
import { dataHoraBr } from "@/lib/escale/negocio/arquivos";
import { ChevronLeft, Pencil } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { AbasDoFluxo, type AbaDoFluxo } from "./AbasDoFluxo";

const UM_MINUTO = 60_000;

/** O selo do estado: Nova, Alterações não salvas (amarelo), Ativa (verde) ou Pausada. */
function Selo({ existe, sujo, ativo }: { existe: boolean; sujo: boolean; ativo: boolean }) {
  const t = useT();
  const [rotulo, classe] = !existe
    ? [t("Nova"), "bg-casca-raia text-casca-texto-2"]
    : sujo
      ? [t("Alterações não salvas"), "bg-warning-bg text-warning-fg"]
      : ativo
        ? [t("Ativa"), "bg-success-bg text-success-fg"]
        : [t("Pausada"), "bg-casca-raia text-casca-texto-2"];
  return <span className={cn("rounded px-1.5 py-0.5 text-[11px]", classe)}>{rotulo}</span>;
}

/**
 * O CABEÇALHO DO FLUXO (07-013; D3–D6): 56 px em três terços. Esquerda: voltar, bolinha,
 * nome com lápis, selo e "Salvo há X". Centro: Editor / Insights. Direita: interruptor,
 * Salvar e o ⋮ (recebido pronto em `menu`).
 */
export function CabecalhoDoFluxo({
  nome,
  existe,
  ativo,
  sujo,
  salvando,
  atualizadoEm,
  fuso,
  aba,
  insightsDisponivel,
  aoMudarAba,
  aoVoltar,
  aoRenomear,
  aoSalvar,
  aoAlternarAtivo,
  menu,
}: {
  nome: string;
  /** Já gravada no banco (a nova não tem interruptor nem "Salvo há"). */
  existe: boolean;
  ativo: boolean;
  sujo: boolean;
  salvando: boolean;
  atualizadoEm: string | null;
  fuso: string;
  aba: AbaDoFluxo;
  insightsDisponivel: boolean;
  aoMudarAba: (aba: AbaDoFluxo) => void;
  aoVoltar: () => void;
  aoRenomear: () => void;
  aoSalvar: () => void;
  aoAlternarAtivo: (ligar: boolean) => void;
  menu: ReactNode;
}) {
  const t = useT();
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const relogio = window.setInterval(() => setAgora(new Date()), UM_MINUTO);
    return () => window.clearInterval(relogio);
  }, []);

  return (
    <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-casca-divisoria bg-surface pr-2.5 pl-5">
      <div className="flex min-w-0 items-center gap-2">
        <BotaoDaCasca variante="icone" aria-label={t("Voltar para as automações")} onClick={aoVoltar}>
          <ChevronLeft size={18} aria-hidden />
        </BotaoDaCasca>
        <span
          aria-hidden
          className={cn("size-2 shrink-0 rounded-full", existe && ativo ? "bg-success ring-4 ring-success/20" : "bg-casca-suave")}
        />
        <div className="flex min-w-0 flex-col">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="max-w-[360px] truncate text-[14px] font-semibold text-casca-texto">{nome || t("Sem nome")}</span>
            <button
              type="button"
              aria-label={t("Renomear automação")}
              onClick={aoRenomear}
              className="grid size-6 shrink-0 place-items-center rounded-md text-casca-suave hover:bg-casca-raia"
            >
              <Pencil size={14} aria-hidden />
            </button>
            <Selo existe={existe} sujo={sujo} ativo={ativo} />
          </div>
          {existe && atualizadoEm ? (
            <span className="text-[10px] text-casca-suave" title={dataHoraBr(atualizadoEm, fuso)}>
              {t("Salvo {tempo}").replace("{tempo}", tempoDesde(atualizadoEm, agora, t))}
            </span>
          ) : null}
        </div>
      </div>
      <AbasDoFluxo aba={aba} aoMudar={aoMudarAba} insightsDisponivel={insightsDisponivel && existe} />
      <div className="flex items-center justify-end gap-2">
        {aba === "insights" ? (
          // FORK ESCALE · Fase 5C (07-011): nos Insights somem o interruptor e o Salvar; fica "Editar automação".
          <BotaoDaCasca
            variante="texto"
            tamanho="sm"
            className="gap-1.5 border border-casca-divisoria text-casca-marca-forte"
            onClick={() => aoMudarAba("editor")}
          >
            <Pencil size={14} aria-hidden />
            {t("Editar automação")}
          </BotaoDaCasca>
        ) : (
          <>
            {existe ? (
              <InterruptorDaCasca
                ligado={ativo}
                aoMudar={aoAlternarAtivo}
                desabilitado={salvando}
                aria-label={ativo ? t("Pausar automação") : t("Ligar automação")}
              />
            ) : null}
            <BotaoDaCasca variante="marca" tamanho="sm" disabled={!sujo || salvando} onClick={aoSalvar}>
              {salvando ? t("Salvando…") : t("Salvar")}
            </BotaoDaCasca>
          </>
        )}
        {menu}
      </div>
    </header>
  );
}
