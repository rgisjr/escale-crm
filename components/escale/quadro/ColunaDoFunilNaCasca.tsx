"use client";
import { useRef, useState } from "react";

import { useChaveDosRecentes, useNegociosRecentes } from "@/hooks/escale/useNegociosRecentes";
import { usePrefsDoCard } from "@/hooks/escale/usePrefsDoCard";
import { useT } from "@/hooks/i18n/useT";
import { PREFS_PADRAO, type CampoDaCapa } from "@/lib/escale/capa/tipos";
import { totalDaColuna } from "@/lib/escale/quadro/aparencia";
import { recenteDoLead } from "@/lib/escale/recentes/regras";
import { buildCardInput } from "@/lib/kanban/card-state";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

import { CardDaCasca } from "./CardDaCasca";
import { ColunaDaCasca } from "./ColunaDaCasca";

/** As props do `StageColumn` do original, mais o "+ Adicionar negócio". */
export interface ColunaDoFunilNaCascaProps {
  stage: Stage;
  leads: Lead[];
  pipelineId: string;
  ownerNames?: Map<string, string | null>;
  coolingIds?: Set<string>;
  reactivations?: Map<string, { proposalId: string; expiresAt: string }>;
  canonicalTags?: string[];
  selectedLeadIds?: Set<string>;
  pulses?: Map<string, number>;
  onSelectMany?: (leadIds: string[], marcar: boolean) => void;
  onOpen?: (leadId: string) => void;
  podeRenomear?: boolean;
  onRenomear?: (nome: string) => void;
  aoAdicionar?: (stageId: string) => void;
  /** Fase 1E: o ⋮ da etapa ("Selecione N"); ausente = sem ⋮. */
  aoSelecionarNaEtapa?: (ids: string[], n: number) => void;
  /** Os campos que o "Personalizar cards" pode pôr no card (Fase 1E). */
  camposDoCard?: readonly CampoDaCapa[];
  /** O nome da origem: o detalhe do negócio nos Recentes do painel (Fase 1E). */
  nomeDaOrigem?: string;
}

const NENHUM = new Set<string>();

/**
 * A ETAPA DO FUNIL NA CASCA (fork Escale, Casca V4): o `KanbanBoard` monta esta
 * coluna no lugar do `StageColumn` quando `aparencia="casca"`. Mesmas props,
 * mesmos comportamentos (seleção, renomear no lugar, pulso, dossiê); visual da
 * Clint. O "ponderado" do original vira a dica do total (D12). "+ Adicionar
 * negócio" só nas etapas abertas (negócio não nasce ganho nem perdido).
 */
export function ColunaDoFunilNaCasca({
  stage,
  leads,
  pipelineId,
  ownerNames,
  coolingIds,
  reactivations,
  canonicalTags,
  selectedLeadIds,
  pulses,
  onSelectMany,
  onOpen,
  podeRenomear = false,
  onRenomear,
  aoAdicionar,
  aoSelecionarNaEtapa,
  camposDoCard,
  nomeDaOrigem,
}: ColunaDoFunilNaCascaProps) {
  const t = useT();
  const { registrar } = useNegociosRecentes(useChaveDosRecentes());
  const prefs = usePrefsDoCard().data ?? PREFS_PADRAO;
  const selecionados = selectedLeadIds ?? NENHUM;
  const chance = stage.is_won ? 100 : stage.is_lost ? 0 : (stage.win_probability ?? null);
  const temValor = leads.some((l) => l.value_cents != null);
  const dicaDoTotal =
    chance === null || !temValor
      ? undefined
      : `${t("ponderado")} ${totalDaColuna(
          leads.map((l) => ({
            value_cents: l.value_cents == null ? null : Math.round((l.value_cents * chance) / 100),
            currency: l.currency,
          })),
        )}`;
  const aberta = !stage.is_won && !stage.is_lost;

  return (
    <ColunaDaCasca
      idDaColuna={stage.id}
      nome={stage.name}
      marcador={{ "data-etapa-do-quadro": stage.id }}
      titulo={
        podeRenomear && onRenomear ? (
          <NomeDaEtapaNaCasca key={stage.name} nome={stage.name} onConfirmar={onRenomear} />
        ) : (
          stage.name
        )
      }
      total={totalDaColuna(leads)}
      dicaDoTotal={dicaDoTotal}
      leads={leads}
      selecionados={selecionados}
      onSelectMany={onSelectMany}
      aoAdicionar={aberta && aoAdicionar ? () => aoAdicionar(stage.id) : undefined}
      menuDaEtapa={
        aoSelecionarNaEtapa
          ? {
              aoSelecionar: (n) =>
                aoSelecionarNaEtapa(
                  leads.map((l) => l.id),
                  n,
                ),
            }
          : undefined
      }
      renderCard={(lead, indice, aoSelecionar) => (
        <CardDaCasca
          key={lead.id}
          card={buildCardInput(lead, {
            stageName: stage.name,
            ownerNames,
            coolingIds,
            reactivations,
            canonicalTags,
          })}
          lead={lead}
          index={indice}
          pipelineId={pipelineId}
          isSelected={selecionados.has(lead.id)}
          isSelecting={selecionados.size > 0}
          pulseCount={pulses?.get(lead.id) ?? 0}
          onSelect={aoSelecionar}
          onOpen={(id) => {
            onOpen?.(id);
            // Fase 1E: o negócio aberto entra nos Recentes do painel.
            registrar(recenteDoLead(lead, nomeDaOrigem ?? ""));
          }}
          nomes={ownerNames}
          prefs={prefs}
          camposDoCard={camposDoCard}
        />
      )}
    />
  );
}

/**
 * O nome da etapa editado no lugar, com o MESMO contrato do `NomeDaEtapaNoQuadro`
 * do original (`StageColumn.tsx`, que não é exportado e fica intacto): salva ao
 * confirmar (Enter ou sair do campo), Escape desfaz, e o `key` pelo nome gravado
 * descarta o rascunho velho.
 */
function NomeDaEtapaNaCasca({
  nome,
  onConfirmar,
}: {
  nome: string;
  onConfirmar: (nome: string) => void;
}) {
  const t = useT();
  const [rascunho, setRascunho] = useState(nome);
  const cancelado = useRef(false);

  function confirmar() {
    const limpo = rascunho.trim();
    if (cancelado.current || !limpo || limpo === nome) {
      cancelado.current = false;
      setRascunho(nome);
      return;
    }
    onConfirmar(limpo);
  }

  return (
    <input
      value={rascunho}
      maxLength={80}
      aria-label={`${t("Nome da etapa")} «${nome}»`}
      data-testid="nome-etapa-quadro"
      onChange={(e) => setRascunho(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          cancelado.current = true;
          e.currentTarget.blur();
        }
      }}
      className="w-full min-w-0 truncate rounded-[4px] bg-transparent text-sm font-medium text-casca-texto outline-hidden hover:bg-surface focus:bg-surface"
    />
  );
}
