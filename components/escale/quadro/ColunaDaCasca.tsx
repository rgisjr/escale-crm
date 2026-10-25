"use client";
import { Droppable } from "@hello-pangea/dnd";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

import type { GestoDeSelecao } from "@/components/kanban/KanbanCard";
import { useT } from "@/hooks/i18n/useT";
import { intervaloDaColuna } from "@/lib/kanban/selecao";
import type { Lead } from "@/lib/types/leads";
import { cn } from "@/lib/utils";

import { MenuDaColuna } from "./MenuDaColuna";

export interface ColunaDaCascaProps {
  /** O `droppableId`: a etapa no funil, a chave da coluna combinada na Visualização. */
  idDaColuna: string;
  /** O nome da etapa (dado do operador: não passa por `t()`). */
  nome: string;
  /** O que vai no título: o nome, ou o campo de renomear. */
  titulo: ReactNode;
  total: string;
  dicaDoTotal?: string;
  /** Os cards já na ordem da tela. */
  leads: Lead[];
  selecionados: Set<string>;
  onSelectMany?: (ids: string[], marcar: boolean) => void;
  renderCard: (
    lead: Lead,
    indice: number,
    aoSelecionar: (leadId: string, gesto: GestoDeSelecao) => void,
  ) => ReactNode;
  /** "+ Adicionar negócio" (só onde faz sentido). */
  aoAdicionar?: () => void;
  /** Fase 1E: o ⋮ da Clint ("Selecionar todos..." e "Selecione N"). Ausente = sem ⋮ (Visualização, viewer). */
  menuDaEtapa?: { aoSelecionar: (n: number) => void };
  /** Os mesmos ganchos do original, para os testes e o e2e acharem a coluna. */
  marcador: { "data-etapa-do-quadro": string } | { "data-coluna-da-visualizacao": string };
}

/**
 * A COLUNA DA CLINT (fork Escale, Casca V4; 01-010 e
 * `docs/escale/clint/crops/colhead.png`; design system §6.10 e §6.12). Raia
 * lavanda de 260px, sem borda; cabeçalho com nome, total e o círculo da
 * contagem; ⋮ da Clint quando há `menuDaEtapa` (Fase 1E); cards de 236px com 16px entre eles; rolagem própria (D7).
 */
export function ColunaDaCasca({
  idDaColuna,
  nome,
  titulo,
  total,
  dicaDoTotal,
  leads,
  selecionados,
  onSelectMany,
  renderCard,
  aoAdicionar,
  menuDaEtapa,
  marcador,
}: ColunaDaCascaProps) {
  const t = useT();
  const ids = leads.map((l) => l.id);
  const aqui = ids.filter((id) => selecionados.has(id)).length;
  // A âncora do shift+clique, como no `StageColumn`: `useRef` para não remontar o Droppable.
  const ancora = useRef<string | null>(null);

  // Q2b (G2-4): `aoSelecionar` estável (lê o estado vivo por ref), para o card memoizado não refazer a cada render.
  const vivo = useRef({ ids, selecionados, onSelectMany });
  useEffect(() => {
    vivo.current = { ids, selecionados, onSelectMany };
  });
  const aoSelecionar = useCallback((leadId: string, gesto: GestoDeSelecao) => {
    const { ids: idsVivos, selecionados: marcados, onSelectMany: selecionarVarios } = vivo.current;
    if (gesto === "intervalo") {
      const faixa = intervaloDaColuna(idsVivos, ancora.current, leadId);
      ancora.current = leadId;
      selecionarVarios?.(faixa, true);
      return;
    }
    ancora.current = leadId;
    selecionarVarios?.([leadId], !marcados.has(leadId));
  }, []);

  return (
    <section
      aria-label={nome}
      {...marcador}
      className="flex h-full w-[260px] shrink-0 flex-col rounded-casca-raia bg-casca-raia"
    >
      <header data-cabecalho-da-etapa className="flex items-center gap-2 pt-4 pr-2 pl-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm leading-5 font-medium text-casca-texto">{titulo}</h2>
          <p className="mt-1 text-xs leading-4 text-casca-texto tabular-nums" title={dicaDoTotal}>
            {total}
          </p>
        </div>
        <span className="grid h-7 min-w-7 shrink-0 place-items-center rounded-full bg-casca-contador px-1 text-[10px] font-semibold text-casca-texto tabular-nums">
          {aqui > 0 ? `${aqui}/${leads.length}` : leads.length}
        </span>
        {menuDaEtapa ? (
          <MenuDaColuna
            nome={nome}
            total={leads.length}
            aoSelecionar={(n) => {
              ancora.current = null;
              menuDaEtapa.aoSelecionar(n);
            }}
          />
        ) : null}
      </header>

      <Droppable droppableId={idDaColuna} type="LEAD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-gutter:stable] flex-col gap-4 overflow-y-auto pt-6 pr-1 pb-3 pl-2",
              snapshot.isDraggingOver && "rounded-b-casca-raia bg-casca-marca-media",
            )}
          >
            {leads.map((lead, indice) => renderCard(lead, indice, aoSelecionar))}
            {provided.placeholder}
            {aoAdicionar ? (
              <button
                type="button"
                onClick={aoAdicionar}
                className="flex w-full shrink-0 items-center justify-start gap-1 rounded-casca-gatilho px-2 py-1 text-[13px] text-casca-texto-2 hover:bg-surface"
              >
                {/* A Clint superior escreve o "+" no texto, alinhado à esquerda (01-010). */}
                {`+ ${t("Adicionar negócio")}`}
              </button>
            ) : null}
          </div>
        )}
      </Droppable>
    </section>
  );
}
