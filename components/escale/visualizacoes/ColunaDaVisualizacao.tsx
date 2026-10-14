"use client";
import { Droppable } from "@hello-pangea/dnd";
import { useRef, type CSSProperties } from "react";

import { KanbanCard, type GestoDeSelecao } from "@/components/kanban/KanbanCard";
import { useT } from "@/hooks/i18n/useT";
import type { ColunaCombinada } from "@/lib/escale/visualizacoes/regras";
import { buildCardInput } from "@/lib/kanban/card-state";
import { intervaloDaColuna } from "@/lib/kanban/selecao";
import { formatSomaPorMoeda, formatValorDoNegocio, MOEDA_PADRAO, somaPorMoeda } from "@/lib/money";
import type { Lead } from "@/lib/types/leads";
import { cn } from "@/lib/utils";

/** O que todo card do quadro combinado precisa, resolvido uma vez no quadro. */
export interface ContextoDosCards {
  /** Origem → nome: o "em Proposta · Leads PA" do rodapé do card. */
  nomeDaOrigem: Record<string, string>;
  /** Origem → `settings.canonical_tags` (a tag que fica no card é a da origem DELE). */
  tagsCanonicas: Record<string, string[]>;
  ownerNames: Map<string, string | null>;
  coolingIds: Set<string>;
  reactivations: Map<string, { proposalId: string; expiresAt: string }>;
  pulses: Map<string, number>;
}

/**
 * UMA COLUNA DO QUADRO COMBINADO (fork Escale, Fase 1C): as etapas de mesmo nome
 * de várias origens. Os cards são os do funil (`KanbanCard`), cada um com o
 * `pipelineId` da PRÓPRIA origem — é o que faz ganhar, perder, editar e mover
 * para outro funil funcionarem igual ao funil. O cabeçalho é só leitura:
 * renomear uma coluna seria renomear etapas de várias origens, e isso se faz em
 * cada origem.
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
  const t = useT();
  // O total por moeda e a moeda que vem primeiro: a mesma régua de `StageColumn`.
  const moedaDoLead = (l: Lead) => l.currency ?? MOEDA_PADRAO;
  const totais = somaPorMoeda(leads, (l) => l.value_cents, moedaDoLead);
  const primeira = [...somaPorMoeda(leads, (l) => (l.value_cents == null ? null : 1), moedaDoLead)].sort(
    ([ma, na], [mb, nb]) => nb - na || ma.localeCompare(mb),
  )[0]?.[0];
  const temTotal = [...totais.values()].some((cents) => cents > 0);

  const ids = leads.map((l) => l.id);
  const aqui = ids.filter((id) => selecionados.has(id)).length;
  const todos = ids.length > 0 && aqui === ids.length;
  const ancora = useRef<string | null>(null);

  const aoSelecionar = (leadId: string, gesto: GestoDeSelecao) => {
    if (gesto === "intervalo") {
      const faixa = intervaloDaColuna(ids, ancora.current, leadId);
      ancora.current = leadId;
      onSelectMany(faixa, true);
      return;
    }
    ancora.current = leadId;
    onSelectMany([leadId], !selecionados.has(leadId));
  };
  const alternarColuna = () => {
    ancora.current = null;
    onSelectMany(ids, !todos);
  };
  const cor: CSSProperties | undefined = coluna.cor ? { backgroundColor: coluna.cor } : undefined;

  return (
    <div
      className="bg-surface-muted/40 flex min-h-full w-[85vw] max-w-80 shrink-0 snap-center flex-col rounded-lg border border-border md:w-80"
      data-coluna-da-visualizacao={coluna.nome}
    >
      <div className="sticky top-0 z-10 rounded-t-lg bg-background">
        <div className="bg-surface-muted/40 rounded-t-lg">
          <div className="group/etapa flex items-center gap-2 border-b border-border px-3 py-2.5">
            <input
              type="checkbox"
              checked={todos}
              ref={(el) => {
                if (el) el.indeterminate = aqui > 0 && !todos;
              }}
              disabled={ids.length === 0}
              onChange={alternarColuna}
              aria-label={todos ? `${t("Desmarcar todos em")} ${coluna.nome}` : `${t("Selecionar todos em")} ${coluna.nome}`}
              className={cn(
                "h-4 w-4 shrink-0 cursor-pointer accent-accent transition-opacity focus:opacity-100 disabled:cursor-default",
                aqui > 0 ? "opacity-100" : "opacity-0 group-hover/etapa:opacity-100 pointer-coarse:opacity-100",
              )}
            />
            <span className={cn("h-2 w-2 rounded-full", !coluna.cor && "bg-text-muted/40")} style={cor} aria-hidden />
            <h2 className="flex-1 truncate text-sm font-semibold text-text">{coluna.nome}</h2>
            <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-text-muted tabular-nums">
              {aqui > 0 ? `${aqui}/${leads.length}` : leads.length}
            </span>
          </div>
          {temTotal && (
            <div className="border-b border-border px-3 py-1.5 text-[11px] text-text-muted tabular-nums">
              {formatSomaPorMoeda(totais, formatValorDoNegocio, { primeira })}
            </div>
          )}
        </div>
      </div>

      <Droppable droppableId={coluna.chave} type="LEAD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn("flex flex-1 flex-col gap-2 p-2 transition-colors", snapshot.isDraggingOver && "bg-accent/5")}
          >
            {leads.map((lead, idx) => (
              <KanbanCard
                key={lead.id}
                card={buildCardInput(lead, {
                  stageName: `${coluna.nome} · ${contexto.nomeDaOrigem[lead.pipeline_id] ?? ""}`,
                  ownerNames: contexto.ownerNames,
                  coolingIds: contexto.coolingIds,
                  reactivations: contexto.reactivations,
                  canonicalTags: contexto.tagsCanonicas[lead.pipeline_id] ?? [],
                })}
                lead={lead}
                index={idx}
                pipelineId={lead.pipeline_id}
                isSelected={selecionados.has(lead.id)}
                isSelecting={selecionados.size > 0}
                pulseCount={contexto.pulses.get(lead.id) ?? 0}
                onSelect={aoSelecionar}
                onOpen={onOpen}
              />
            ))}
            {provided.placeholder}
            {leads.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex h-20 items-center justify-center text-[11px] text-text-muted">{t("vazio")}</div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
