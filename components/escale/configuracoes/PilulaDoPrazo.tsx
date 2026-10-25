"use client";
import { QueryClientContext } from "@tanstack/react-query";
import { useContext } from "react";

import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import { useT } from "@/hooks/i18n/useT";
import { lerAlerta, nivelDoPrazo, type NivelDoPrazo } from "@/lib/escale/configuracoes/alerta";
import { CHAVE_DO_ALERTA, comoRecord } from "@/lib/escale/configuracoes/tipos";
import type { BoardData } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import { Clock } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** Medidas no P16 (docs/clint/prints-1f): no prazo sem fundo e com peso 500; os outros com fundo e 600. */
const COR: Record<NivelDoPrazo, string> = {
  ok: "border-(--escale-prazo-ok-borda) bg-(--escale-prazo-ok-fundo) font-medium text-(--escale-prazo-ok-texto)",
  atencao:
    "border-(--escale-prazo-atencao-borda) bg-(--escale-prazo-atencao-fundo) font-semibold text-(--escale-prazo-atencao-texto)",
  critico:
    "border-(--escale-prazo-critico-borda) bg-(--escale-prazo-critico-fundo) font-semibold text-(--escale-prazo-critico-texto)",
};

/** A pílula do tempo na etapa (Clint, `StageTimeAlerts` e o rodapé do card): relógio + tempo, na cor do nível. */
export function PilulaDoPrazo({ nivel, tempo }: { nivel: NivelDoPrazo; tempo: string }) {
  const t = useT();
  const nome: Record<NivelDoPrazo, string> = {
    ok: t("dentro do prazo"),
    atencao: t("passou de atenção"),
    critico: t("passou de crítico"),
  };
  return (
    <span
      data-prazo={nivel}
      title={`${t("Tempo na etapa")}: ${nome[nivel]}`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-[5px] border-[0.8px] px-[7px] py-[3px] text-[10px] leading-none",
        COR[nivel],
      )}
    >
      <Clock size={11} aria-hidden />
      {tempo}
    </span>
  );
}

/**
 * O TEMPO NA ETAPA NO RODAPÉ DO CARD DA CASCA (Fase 1F, B16). Com regra de
 * alerta na origem DO CARD, é a pílula; sem regra (ou etapa encerrada), o
 * relógio + tempo da V4. Lê o cache do quadro como a janela de perder;
 * `useContext` para o card sem provedor continuar o de sempre.
 */
export function PrazoDoCard({
  lead,
  horasNaEtapa,
  tempo,
}: {
  lead: Lead;
  horasNaEtapa: number | null;
  tempo: string;
}) {
  const t = useT();
  const qc = useContext(QueryClientContext);
  const quadro = qc?.getQueryData<BoardData>(chaveDoQuadro(lead.pipeline_id));
  const etapa = quadro?.stages.find((s) => s.id === lead.stage_id);
  const nivel =
    quadro && etapa
      ? nivelDoPrazo({
          // Só o alerta: `lerConfiguracoesDoFork` leria as 11 configurações (com zod) por card.
          alerta: lerAlerta(comoRecord(quadro.pipeline.settings)[CHAVE_DO_ALERTA]),
          etapa,
          horasNaEtapa,
        })
      : null;
  if (!tempo) return null;
  if (nivel) return <PilulaDoPrazo nivel={nivel} tempo={tempo} />;
  return (
    <span title={t("Tempo na etapa")} className="flex items-center gap-1">
      <Clock size={12} aria-hidden />
      {tempo}
    </span>
  );
}
