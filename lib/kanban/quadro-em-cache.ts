import type { QueryClient } from "@tanstack/react-query";

import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import type { BoardData } from "@/lib/kanban/types";

/**
 * O QUE O CACHE SABE DO FUNIL, esteja o quadro inteiro nele ou não.
 *
 * Moeda, motivos de perda e campos obrigatórios por etapa vêm de `pipeline`, `stages` e
 * `pipeline.settings`, que o negócio leve da ficha (`GET /api/v1/leads/:id/ficha`) traz
 * iguais aos do quadro. Quem lê o quadro por fora do `useQuery` (os hooks da ficha e da
 * janela de perder) passa por aqui: com a ficha aberta por link o quadro ainda não está
 * em cache e, sem este fallback, cada um devolveria o padrão em silêncio (moeda errada,
 * motivos do produto, portão de campos desligado).
 *
 * O quadro vence quando existe: é o mais novo (o tempo real e as escritas otimistas o
 * mantêm). As chaves partem de `chaveDoQuadro`, nunca de literal: o negócio leve mora
 * debaixo dela (ver `chaveDoNegocioLeve`).
 */
export function quadroEmCache(qc: QueryClient, pipelineId: string): BoardData | undefined {
  const inteiro = qc.getQueryData<BoardData>(chaveDoQuadro(pipelineId));
  if (inteiro) return inteiro;
  const leves = qc.getQueriesData<BoardData>({ queryKey: [...chaveDoQuadro(pipelineId), "negocio"] });
  return leves.find(([, dados]) => dados)?.[1];
}
