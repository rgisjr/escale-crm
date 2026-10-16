"use client";
import { CardDaCasca } from "@/components/escale/quadro/CardDaCasca";
import { ColunaDaCasca } from "@/components/escale/quadro/ColunaDaCasca";
import { usePrefsDoCard } from "@/hooks/escale/usePrefsDoCard";
import { PREFS_PADRAO, type CampoDaCapa } from "@/lib/escale/capa/tipos";
import { totalDaColuna } from "@/lib/escale/quadro/aparencia";
import type { ColunaCombinada } from "@/lib/escale/visualizacoes/regras";
import { buildCardInput } from "@/lib/kanban/card-state";
import type { Lead } from "@/lib/types/leads";

/** O que todo card do quadro combinado precisa, resolvido uma vez no quadro. */
export interface ContextoDosCards {
  /** Origem → nome: a linha da origem no card (D15). */
  nomeDaOrigem: Record<string, string>;
  /** Origem → `settings.canonical_tags` (a tag que fica no card é a da origem DELE). */
  tagsCanonicas: Record<string, string[]>;
  ownerNames: Map<string, string | null>;
  coolingIds: Set<string>;
  reactivations: Map<string, { proposalId: string; expiresAt: string }>;
  pulses: Map<string, number>;
  /** Os campos que o "Personalizar cards" pode pôr no card: a união das origens (Fase 1E). */
  camposDoCard: readonly CampoDaCapa[];
}

/**
 * UMA COLUNA DO QUADRO COMBINADO (fork Escale, Fase 1C; visual da Clint na Casca
 * V4): as etapas de mesmo nome de várias origens, na `ColunaDaCasca`. Cada card
 * leva o `pipelineId` da PRÓPRIA origem (ganhar, perder, editar e mover
 * funcionam igual ao funil) e mostra o nome dela. O cabeçalho é só leitura e não
 * tem "+ Adicionar negócio": a etapa é de várias origens.
 */
export function ColunaDaVisualizacao({
  coluna,
  leads,
  contexto,
  selecionados,
  onSelectMany,
  onOpen,
}: {
  coluna: ColunaCombinada;
  leads: Lead[];
  contexto: ContextoDosCards;
  selecionados: Set<string>;
  onSelectMany: (ids: string[], marcar: boolean) => void;
  onOpen: (leadId: string) => void;
}) {
  const prefs = usePrefsDoCard().data ?? PREFS_PADRAO;
  return (
    <ColunaDaCasca
      idDaColuna={coluna.chave}
      nome={coluna.nome}
      marcador={{ "data-coluna-da-visualizacao": coluna.nome }}
      titulo={coluna.nome}
      total={totalDaColuna(leads)}
      leads={leads}
      selecionados={selecionados}
      onSelectMany={onSelectMany}
      renderCard={(lead, indice, aoSelecionar) => {
        const origem = contexto.nomeDaOrigem[lead.pipeline_id] ?? "";
        return (
          <CardDaCasca
            key={lead.id}
            card={buildCardInput(lead, {
              stageName: `${coluna.nome} · ${origem}`,
              ownerNames: contexto.ownerNames,
              coolingIds: contexto.coolingIds,
              reactivations: contexto.reactivations,
              canonicalTags: contexto.tagsCanonicas[lead.pipeline_id] ?? [],
            })}
            lead={lead}
            index={indice}
            pipelineId={lead.pipeline_id}
            isSelected={selecionados.has(lead.id)}
            isSelecting={selecionados.size > 0}
            pulseCount={contexto.pulses.get(lead.id) ?? 0}
            onSelect={aoSelecionar}
            onOpen={onOpen}
            nomes={contexto.ownerNames}
            origem={origem}
            prefs={prefs}
            camposDoCard={contexto.camposDoCard}
          />
        );
      }}
    />
  );
}
