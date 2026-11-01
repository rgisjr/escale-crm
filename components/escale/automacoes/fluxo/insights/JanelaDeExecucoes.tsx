"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useState } from "react";
import { toast } from "sonner";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { CampoDeBuscaDaLista } from "@/components/escale/ui/CampoDeBuscaDaLista";
import { ErroDaLista } from "@/components/escale/ui/ErroDaLista";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { exportarExecucoesEmCsv, queryDasExecucoes, useExecucoesDaAutomacao } from "@/hooks/escale/useInsightsDaAutomacao";
import { useT } from "@/hooks/i18n/useT";
import type { AutomationRuleRow } from "@/hooks/webhooks/useAutomationRules";
import { ApiError } from "@/lib/api/types";
import { POR_PAGINA_DAS_EXECUCOES } from "@/lib/escale/automacoes/insights/schema";
import { selecionadosIniciais } from "@/lib/escale/automacoes/insights/regras";
import type { FiltroDasExecucoes, PeriodoDosInsights } from "@/lib/escale/automacoes/insights/tipos";

import { CartaoDaExecucao } from "./CartaoDaExecucao";
import { FiltroDeEventos } from "./FiltroDeEventos";

const ESQUELETOS = 5;
const ATRASO_DA_BUSCA_MS = 750;
const ERRO_DE_TETO = "lista_grande_demais";

/**
 * A LISTAGEM DE EXECUÇÕES (07-029, 07-030; fork Escale, Fase 5C; I9–I13): o modal largo com busca
 * pelo contato, o filtro "Eventos", o total, os cartões, 10 por página e "Exportar CSV".
 * Diferença da Clint: cada linha é uma execução (a Clint lista contatos).
 */
export function JanelaDeExecucoes({
  regra,
  fuso,
  periodo,
  filtroInicial,
  aoFechar,
}: {
  regra: AutomationRuleRow;
  fuso: string;
  periodo: PeriodoDosInsights;
  filtroInicial: FiltroDasExecucoes;
  aoFechar: () => void;
}) {
  const t = useT();
  const [selecionados, setSelecionados] = useState<string[]>(() => selecionadosIniciais(filtroInicial));
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [exportando, setExportando] = useState(false);
  const consulta = useExecucoesDaAutomacao(regra.id, periodo, filtroInicial, selecionados, busca, pagina);
  const total = consulta.data?.total ?? 0;
  const acoes = Array.isArray(regra.actions) ? (regra.actions as { type: string }[]) : [];

  async function exportar() {
    setExportando(true);
    toast.info(t("Exportando..."));
    try {
      await exportarExecucoesEmCsv(regra.id, queryDasExecucoes(periodo, filtroInicial, selecionados, busca), fuso, t);
      toast.success(t("Exportação realizada com sucesso! Seu arquivo CSV foi gerado e está sendo baixado."));
    } catch (e) {
      toast.error(
        e instanceof ApiError && e.code === ERRO_DE_TETO
          ? e.message
          : t("Não foi possível exportar o arquivo CSV. Tente novamente."),
      );
    } finally {
      setExportando(false);
    }
  }

  return (
    <JanelaDaCasca
      aberta
      onFechar={aoFechar}
      className="h-[min(92dvh,56rem)] max-h-[92dvh] w-[min(80rem,calc(100vw-2rem))] grid-rows-[auto_auto_auto_1fr_auto] gap-0 overflow-hidden p-0"
    >
      <div className="flex items-center justify-between border-b border-casca-divisoria px-6 py-4">
        <DialogTitle className="text-[15px] font-semibold text-casca-texto">{t("Listagem de execuções")}</DialogTitle>
        <DialogPrimitive.Description className="sr-only">{regra.name}</DialogPrimitive.Description>
      </div>
      <div className="flex items-center gap-4 px-6 pt-5">
        <CampoDeBuscaDaLista
          valorDaUrl={busca}
          aoBuscar={(q) => {
            setBusca(q ?? "");
            setPagina(1);
          }}
          rotulo={t("Buscar")}
          atrasoMs={ATRASO_DA_BUSCA_MS}
          className="flex h-9 flex-1 items-center gap-2 rounded-md bg-casca-busca px-3 text-[13px]"
        />
        <FiltroDeEventos
          filtro={filtroInicial}
          selecionados={selecionados}
          aoMudar={(s) => {
            setSelecionados(s);
            setPagina(1);
          }}
        />
        <BotaoDaCasca variante="marca" disabled={exportando || total === 0} onClick={() => void exportar()}>
          {exportando ? t("Exportando...") : t("Exportar CSV")}
        </BotaoDaCasca>
      </div>
      <p className="px-6 pt-3 text-right text-[13px] font-medium text-casca-texto">
        {total === 1 ? t("1 execução") : t("{n} execuções").replace("{n}", total.toLocaleString("pt-BR"))}
      </p>
      <div className="mx-6 my-3 overflow-y-auto rounded-lg bg-casca-fluxo p-4">
        {consulta.isError && !consulta.data ? (
          <ErroDaLista mensagem={t("Não foi possível carregar as execuções.")} aoTentar={() => void consulta.refetch()} />
        ) : consulta.isPending ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: ESQUELETOS }, (_, i) => (
              <div key={i} data-testid="esqueleto-da-execucao" className="h-16 animate-pulse rounded-lg bg-surface" />
            ))}
          </div>
        ) : total === 0 ? (
          <p className="py-10 text-center text-[13px] text-casca-suave">{t("Nenhuma execução encontrada.")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {consulta.data!.linhas.map((l) => (
              <CartaoDaExecucao key={l.id} linha={l} acoes={acoes} fuso={fuso} />
            ))}
          </ul>
        )}
      </div>
      <div className="px-6 pb-4">
        <PaginacaoDaCasca
          pagina={pagina}
          total={total}
          porPagina={POR_PAGINA_DAS_EXECUCOES}
          opcoesPorPagina={[POR_PAGINA_DAS_EXECUCOES]}
          aoMudarPagina={setPagina}
          aoMudarPorPagina={() => undefined}
        />
      </div>
    </JanelaDaCasca>
  );
}
