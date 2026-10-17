"use client";
import { useMemo } from "react";

import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { useBoard } from "@/hooks/kanban/useBoard";
import { moedaDaOrigem } from "@/lib/escale/configuracoes/tipos";
import { recortarQuadro } from "@/lib/escale/filtros/aplicar";
import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import { comparadorDaOrdem } from "@/lib/escale/filtros/ordenar";
import { filtrosDaUrl } from "@/lib/escale/filtros/url";
import type { Pipeline, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

/**
 * O NEGÓCIO DA FICHA (fork Escale, Fase 1G).
 *
 * Lê do MESMO cache do quadro (`["board", origemId]`): o tempo real, ganhar,
 * perder, editar, mover e excluir (que gravam nesse cache) e os motivos de
 * perda da origem funcionam aqui sem rota nova. O recorte e a ordem são os do
 * quadro, a partir dos filtros que vieram na URL (C8: "leva em consideração a
 * ordem e os filtros atuais da listagem de negócios").
 */
type Busca = Parameters<typeof filtrosDaUrl>[0];

export interface FichaCarregada {
  estado: "pronto";
  lead: Lead;
  pipeline: Pipeline;
  stages: Stage[];
  /** Os negócios do quadro depois dos filtros da URL (o próximo negócio anda neles). */
  leadsDoRecorte: Lead[];
  /** Todos os negócios do funil, sem filtro (a checagem de duplicidade do "Novo negócio"). */
  leadsDoQuadro: Lead[];
  ordem: ((a: Lead, b: Lead) => number) | undefined;
  atualizar: () => void;
}

export type Ficha =
  { estado: "carregando" } | { estado: "erro" } | { estado: "sumiu" } | FichaCarregada;

export function useFichaDoNegocio(negocioId: string, origemId: string, busca: Busca): Ficha {
  const { data, isLoading, error, refetch } = useBoard(origemId);
  const org = useActiveOrg();
  const filtros = useMemo(() => filtrosDaUrl(busca).filtros, [busca]);
  const campos = useMemo(
    () => camposFiltraveis([data?.pipeline.settings]),
    [data?.pipeline.settings],
  );
  return useMemo((): Ficha => {
    // Um refetch que falha com o quadro em cache não apaga a ficha.
    if (error && !data) return { estado: "erro" };
    if (isLoading || !data) return { estado: "carregando" };
    const lead = data.leads.find((l) => l.id === negocioId);
    if (!lead) return { estado: "sumiu" };
    // Mesma moeda do recorte do quadro (`app/app/pipelines/[id]/_client.tsx`).
    const recorte = recortarQuadro(data, filtros, {
      moeda: moedaDaOrigem(data.pipeline.settings) ?? org?.currency ?? null,
      campos,
    });
    return {
      estado: "pronto",
      lead,
      pipeline: data.pipeline,
      stages: data.stages,
      leadsDoRecorte: recorte.leads,
      leadsDoQuadro: data.leads,
      ordem: comparadorDaOrdem(filtros.ordem, campos),
      atualizar: () => void refetch(),
    };
  }, [error, isLoading, data, negocioId, filtros, org?.currency, campos, refetch]);
}
