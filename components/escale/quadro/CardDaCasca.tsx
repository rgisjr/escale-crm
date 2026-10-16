"use client";
import { Draggable } from "@hello-pangea/dnd";
import type { MouseEvent } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import type { GestoDeSelecao } from "@/components/kanban/KanbanCard";
import { KanbanCardActions } from "@/components/kanban/KanbanCardActions";
import { NextActionSlot } from "@/components/kanban/NextActionSlot";
import { ReactivationSlot } from "@/components/kanban/ReactivationSlot";
import { ScoreSlot } from "@/components/kanban/ScoreSlot";
import { useT } from "@/hooks/i18n/useT";
import { tituloDoCard } from "@/lib/escale/quadro/aparencia";
import { resolveCardState, type CardInput } from "@/lib/kanban/card-state";
import type { Lead } from "@/lib/types/leads";
import { cn } from "@/lib/utils";

import { CaixaDaMensagem, ChipsDoCard, FotoDoContato, RodapeDoCard } from "./PecasDoCard";

export interface CardDaCascaProps {
  card: CardInput;
  lead: Lead;
  index: number;
  /** A origem do card (na Visualização, a de cada card): ações e movimento usam esta. */
  pipelineId: string;
  isSelected?: boolean;
  isSelecting?: boolean;
  pulseCount?: number;
  onSelect?: (leadId: string, gesto: GestoDeSelecao) => void;
  onOpen?: (leadId: string) => void;
  /** user_id → nome: o atendente da caixa da mensagem. */
  nomes?: Map<string, string | null>;
  /** Na Visualização, o nome da origem do card, numa linha pequena abaixo do nome (D15). */
  origem?: string;
}

const parar = (e: MouseEvent) => e.stopPropagation();

/**
 * O CARD DA CLINT (fork Escale, Casca V4; `01-010-kanban-v1.png` e
 * `docs/escale/clint/crops/card1.png`). De cima para baixo: tags, nome com a
 * foto à direita, a caixa da última mensagem e o rodapé (dono, atalhos, valor,
 * atividades e tempo na etapa).
 *
 * Os comportamentos são os do `KanbanCard` do original, que segue intacto na
 * lateral: clique abre o dossiê, ctrl/cmd seleciona, shift estende, o ⋮ de
 * ações, o pulso do tempo real e a linha do agente (só quando tem o que dizer,
 * D9). A caixinha de seleção aparece no lugar da foto no hover (D10).
 */
export function CardDaCasca({
  card,
  lead,
  index,
  pipelineId,
  isSelected = false,
  isSelecting = false,
  pulseCount = 0,
  onSelect,
  onOpen,
  nomes,
  origem,
}: CardDaCascaProps) {
  const t = useT();
  const titulo = tituloDoCard(lead);
  const state = resolveCardState(card, t);

  const decidirClique = (e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }): void => {
    if (e.shiftKey) {
      onSelect?.(card.id, "intervalo");
      return;
    }
    if (e.metaKey || e.ctrlKey) {
      onSelect?.(card.id, "alterna");
      return;
    }
    onOpen?.(card.id);
  };

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          role="group"
          aria-label={`${t("Lead")}: ${titulo}`}
          onClick={decidirClique}
          data-card-da-casca={card.id}
          className={cn(
            "group relative w-full shrink-0 overflow-hidden rounded-casca-card bg-surface transition-shadow",
            "hover:shadow-[0_2px_8px_color-mix(in_oklab,var(--color-casca-marca)_15%,transparent)]",
            snapshot.isDragging && "rotate-1 shadow-casca-painel",
            isSelected && "ring-2 ring-casca-novo",
          )}
        >
          {pulseCount > 0 && (
            <span
              key={pulseCount}
              aria-hidden
              data-pulse={pulseCount}
              className="card-pulse pointer-events-none absolute inset-0"
            />
          )}

          <div className="min-h-[51px] p-2 pb-1">
            <ChipsDoCard lead={lead} />
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="mt-2 mb-1 truncate text-[13px] leading-[15px] font-medium text-casca-texto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      decidirClique(e);
                    }}
                    className="max-w-full truncate text-left hover:underline"
                  >
                    {titulo}
                  </button>
                </h3>
                {origem ? <p className="truncate text-[10px] text-casca-meta">{origem}</p> : null}
              </div>
              <div className="relative size-7 shrink-0">
                <FotoDoContato lead={lead} />
                <span
                  onClick={parar}
                  onPointerDown={parar}
                  className={cn(
                    "absolute inset-0 grid place-items-center rounded-full bg-surface transition-opacity",
                    isSelected || isSelecting
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
                  )}
                >
                  <CaixaDaCasca
                    marcada={isSelected}
                    aoMudar={() => onSelect?.(card.id, "alterna")}
                    aria-label={`${t("Selecionar")}: ${titulo}`}
                  />
                </span>
              </div>
            </div>
            <div
              onClick={parar}
              onPointerDown={parar}
              className="absolute top-1 right-10 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
            >
              <KanbanCardActions lead={lead} pipelineId={pipelineId} />
            </div>
          </div>

          <CaixaDaMensagem lead={lead} nomes={nomes} />

          {state.slot.type !== "idle" ? (
            <div className="flex min-h-6 items-center gap-2 px-2 pb-2 text-xs">
              {state.slot.type === "awaiting" && (
                <NextActionSlot
                  label={state.slot.label}
                  leadId={card.id}
                  approvedSeq={lead.next_action?.seq ?? -1}
                  pipelineId={pipelineId}
                />
              )}
              {state.slot.type === "reactivation" && (
                <ReactivationSlot
                  leadId={card.id}
                  proposalId={state.slot.proposalId}
                  expiresAt={state.slot.expiresAt}
                  pipelineId={pipelineId}
                />
              )}
              {state.slot.type === "cooling" && (
                <span className="truncate text-warning-fg">{state.slot.label}</span>
              )}
              {state.slot.type === "meter" && (
                <ScoreSlot
                  probability={state.slot.probability}
                  band={state.slot.band}
                  reason={state.slot.reason}
                  factors={state.slot.factors}
                />
              )}
            </div>
          ) : null}

          <RodapeDoCard card={card} lead={lead} />
        </div>
      )}
    </Draggable>
  );
}
