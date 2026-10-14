"use client";
import { useMemo } from "react";

import { BulkActionBar } from "@/components/kanban/BulkActionBar";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";
import type { BoardData } from "@/lib/kanban/types";

/**
 * A AÇÃO EM LOTE NO QUADRO COMBINADO (fork Escale, Fase 1C).
 *
 * Com cards de UMA origem, é a barra do funil inteira (mover para etapa,
 * responsável, tag, excluir) com as etapas e o vocabulário dessa origem. Com
 * cards de várias, um aviso: "mover para a etapa X" não tem um destino só, e a
 * barra do funil foi desenhada para um funil por vez.
 */
export function LoteDaVisualizacao({
  selecionados,
  quadros,
  onLimpar,
}: {
  selecionados: string[];
  quadros: BoardData[];
  onLimpar: () => void;
}) {
  const t = useT();
  const origemDe = useMemo(
    () => new Map(quadros.flatMap((q) => q.leads.map((l) => [l.id, q.pipeline.id] as const))),
    [quadros],
  );
  if (selecionados.length === 0) return null;

  const origens = [...new Set(selecionados.flatMap((id) => origemDe.get(id) ?? []))];
  // Seleção velha (o card sumiu num refresh em tempo real): sem origem conhecida, não há o que agir.
  if (origens.length === 0) return null;
  const quadro = origens.length === 1 ? quadros.find((q) => q.pipeline.id === origens[0]) : undefined;
  if (quadro) {
    return (
      <BulkActionBar
        selectedIds={selecionados}
        stages={quadro.stages}
        pipelineId={quadro.pipeline.id}
        vocabulary={quadro.pipeline.vocabulary ?? null}
        tagsExistentes={[...new Set(quadro.leads.flatMap((l) => l.tags))].sort()}
        onClear={onLimpar}
      />
    );
  }

  return (
    <div
      role="status"
      className="sticky bottom-4 z-30 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 shadow-md"
    >
      <span className="text-sm">
        {t("{n} negócios de {k} origens selecionados. A ação em lote vale para uma origem por vez.")
          .replace("{n}", String(selecionados.length))
          .replace("{k}", String(origens.length))}
      </span>
      <Button size="sm" variant="outline" onClick={onLimpar}>
        {t("Limpar seleção")}
      </Button>
    </div>
  );
}
