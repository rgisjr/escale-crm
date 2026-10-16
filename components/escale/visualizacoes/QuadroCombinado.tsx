"use client";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CamposObrigatoriosDialog } from "@/components/kanban/CamposObrigatoriosDialog";
import { LeadDossier } from "@/components/kanban/LeadDossier";
import { RetomarComoNovoNegocioDialog } from "@/components/kanban/RetomarComoNovoNegocioDialog";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import type { RecusaDeCampos, RetomadaPendente } from "@/hooks/kanban/useMoveCard";
import { useAtRiskLeads } from "@/hooks/leads/useAtRiskLeads";
import { useReactivations } from "@/hooks/leads/useReactivations";
import { posicaoNoFimDaEtapa } from "@/lib/escale/filtros/ordenar";
import {
  alternarNaSelecao,
  cardsDaColuna,
  montarColunas,
  planejarSoltura,
} from "@/lib/escale/visualizacoes/regras";
import type { BoardData } from "@/lib/kanban/types";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import type { Lead } from "@/lib/types/leads";

import { ColunaDaVisualizacao, type ContextoDosCards } from "./ColunaDaVisualizacao";
import { MotorDaOrigem, type Mover } from "./MotorDaOrigem";

interface RecusaNaOrigem {
  pipelineId: string;
  recusa: RecusaDeCampos;
}
interface RetomadaNaOrigem {
  pipelineId: string;
  retomada: RetomadaPendente;
}

/**
 * O QUADRO DE UMA VISUALIZAÇÃO (fork Escale, Fase 1C): as colunas combinadas
 * (`montarColunas`), o arrasto, o dossiê e as duas janelas que o arrasto do
 * funil abre (campos obrigatórios e retomada). Tudo o que muda um card usa os
 * hooks do funil com a origem DO CARD — o `MotorDaOrigem` de cada origem
 * entrega o `mover` dela.
 *
 * `leads` chega já filtrado pela página; o `after` do arrasto sai do cache SEM
 * filtro da origem do card, como no funil (#2545).
 */
export function QuadroCombinado({
  quadros,
  leads,
  selecionados,
  onSelecao,
  leadInicial,
  ordemDosCards,
}: {
  quadros: BoardData[];
  leads: Lead[];
  selecionados: string[];
  onSelecao: (ids: string[]) => void;
  leadInicial?: string | null;
  /** A ordenação da barra (Fase 1D). Com ela, arrastar só muda de etapa, e o card vai para o fim. */
  ordemDosCards?: (a: Lead, b: Lead) => number;
}) {
  const t = useT();
  const qc = useQueryClient();
  const colunas = useMemo(() => montarColunas(quadros), [quadros]);
  const quadroDe = useMemo(() => new Map(quadros.map((q) => [q.pipeline.id, q])), [quadros]);
  const selecionadosSet = useMemo(() => new Set(selecionados), [selecionados]);

  // `useRef`: trocar o `mover` registrado não muda nada na tela.
  const movers = useRef<ReadonlyMap<string, Mover>>(new Map());
  const registrarMover = useCallback((pipelineId: string, mover: Mover | null) => {
    const proximo = new Map(movers.current);
    if (mover) proximo.set(pipelineId, mover);
    else proximo.delete(pipelineId);
    movers.current = proximo;
  }, []);

  const [pulsosPorOrigem, setPulsosPorOrigem] = useState<
    Readonly<Record<string, Map<string, number>>>
  >({});
  const registrarPulsos = useCallback((pipelineId: string, pulsos: Map<string, number>) => {
    setPulsosPorOrigem((atual) =>
      atual[pipelineId] === pulsos ? atual : { ...atual, [pipelineId]: pulsos },
    );
  }, []);
  const [recusa, setRecusa] = useState<RecusaNaOrigem | null>(null);
  const [retomada, setRetomada] = useState<RetomadaNaOrigem | null>(null);
  const aoFaltarCampos = useCallback(
    (pipelineId: string, r: RecusaDeCampos) => setRecusa({ pipelineId, recusa: r }),
    [],
  );
  const aoRetomar = useCallback(
    (pipelineId: string, r: RetomadaPendente) => setRetomada({ pipelineId, retomada: r }),
    [],
  );

  const { data: members } = useAssignableMembers(true);
  const { data: atRisk } = useAtRiskLeads();
  const { data: propostasVivas } = useReactivations();

  const contexto = useMemo<ContextoDosCards>(() => {
    const origens = new Set(quadros.map((q) => q.pipeline.id));
    return {
      nomeDaOrigem: Object.fromEntries(quadros.map((q) => [q.pipeline.id, q.pipeline.name])),
      tagsCanonicas: Object.fromEntries(
        quadros.map((q) => {
          const bruto = (q.pipeline.settings ?? {}).canonical_tags;
          return [
            q.pipeline.id,
            Array.isArray(bruto) ? bruto.filter((x): x is string => typeof x === "string") : [],
          ];
        }),
      ),
      ownerNames: new Map((members ?? []).map((m) => [m.user_id, m.full_name])),
      // Esfriando vem do MESMO radar do funil, recortado pelas origens daqui.
      coolingIds: new Set(
        (atRisk?.items ?? [])
          .filter(
            (i) => origens.has(i.pipeline_id) && (i.risk === "em_risco" || i.risk === "critico"),
          )
          .map((i) => i.id),
      ),
      reactivations: new Map(
        (propostasVivas ?? []).map((p) => [
          p.lead_id,
          { proposalId: p.proposal_id, expiresAt: p.expires_at },
        ]),
      ),
      pulses: new Map(Object.values(pulsosPorOrigem).flatMap((m) => [...m])),
    };
  }, [quadros, members, atRisk, propostasVivas, pulsosPorOrigem]);

  const [dossieId, setDossieId] = useState<string | null>(leadInicial ?? null);
  const leadDoDossie = dossieId ? (leads.find((l) => l.id === dossieId) ?? null) : null;
  const quadroDoDossie = leadDoDossie ? quadroDe.get(leadDoDossie.pipeline_id) : undefined;

  const selecionarVarios = useCallback(
    (ids: string[], marcar: boolean) =>
      onSelecao([...alternarNaSelecao(selecionadosSet, ids, marcar)]),
    [onSelecao, selecionadosSet],
  );

  const aoSoltar = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (source.droppableId === destination.droppableId && source.index === destination.index)
        return;
      const lead = leads.find((l) => l.id === draggableId);
      const coluna = colunas.find((c) => c.chave === destination.droppableId);
      if (!lead || !coluna) return;
      const recusar = () =>
        toast.error(
          t("A origem «{origem}» não tem a etapa «{etapa}».")
            .replace("{origem}", quadroDe.get(lead.pipeline_id)?.pipeline.name ?? "")
            .replace("{etapa}", coluna.nome),
        );

      // Fase 1D: com ordenação ativa, a posição na coluna é a da ordenação. Mesma
      // coluna = nada; outra coluna = fim da etapa (inteira, do cache da origem).
      if (ordemDosCards) {
        if (source.droppableId === destination.droppableId) return;
        const stageId = coluna.destinos[lead.pipeline_id];
        if (!stageId) {
          recusar();
          return;
        }
        const daOrigem =
          qc.getQueryData<BoardData>(chaveDoQuadro(lead.pipeline_id))?.leads ?? leads;
        movers.current.get(lead.pipeline_id)?.({
          leadId: lead.id,
          stageId,
          positionInStage: posicaoNoFimDaEtapa(daOrigem, stageId, lead.id),
          expectedUpdatedAt: lead.updated_at,
        });
        return;
      }

      const destino = coluna.destinos[lead.pipeline_id];
      const etapaInteira = destino
        ? (qc
            .getQueryData<BoardData>(chaveDoQuadro(lead.pipeline_id))
            ?.leads.filter((l) => l.stage_id === destino) ?? null)
        : null;
      const soltura = planejarSoltura({
        lead,
        coluna,
        visiveis: cardsDaColuna(coluna, leads),
        indice: destination.index,
        etapaInteira,
      });
      if (soltura.tipo === "recusa") {
        recusar();
        return;
      }
      if (soltura.tipo === "nada") return;
      movers.current.get(soltura.pipelineId)?.({
        leadId: lead.id,
        stageId: soltura.stageId,
        positionInStage: soltura.positionInStage,
        expectedUpdatedAt: lead.updated_at,
      });
    },
    [leads, colunas, qc, quadroDe, t, ordemDosCards],
  );

  return (
    <>
      {quadros.map((q) => (
        <MotorDaOrigem
          key={q.pipeline.id}
          pipelineId={q.pipeline.id}
          onMover={registrarMover}
          onPulsos={registrarPulsos}
          onCamposFaltando={aoFaltarCampos}
          onRetomada={aoRetomar}
        />
      ))}
      <DragDropContext onDragEnd={aoSoltar}>
        {/* Um contêiner de rolagem só, como o quadro do funil (`KanbanBoard`). */}
        {/* Casca V4: como o quadro do funil na casca, cada coluna rola sozinha e o quadro só anda para o lado. */}
        <div
          className="flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto overflow-y-hidden pb-3"
          data-quadro-da-visualizacao
        >
          {colunas.map((coluna) => (
            <ColunaDaVisualizacao
              key={coluna.chave}
              coluna={coluna}
              leads={cardsDaColuna(coluna, leads, ordemDosCards)}
              contexto={contexto}
              selecionados={selecionadosSet}
              onSelectMany={selecionarVarios}
              onOpen={setDossieId}
            />
          ))}
        </div>
      </DragDropContext>

      {leadDoDossie && quadroDoDossie && (
        <LeadDossier
          open
          onOpenChange={(aberto: boolean) => !aberto && setDossieId(null)}
          lead={leadDoDossie}
          pipelineId={leadDoDossie.pipeline_id}
          fieldDefs={camposDoFunil(quadroDoDossie.pipeline.settings ?? null)}
          stageName={quadroDoDossie.stages.find((s) => s.id === leadDoDossie.stage_id)?.name ?? "—"}
          ownerNames={contexto.ownerNames}
        />
      )}

      <CamposObrigatoriosDialog
        open={recusa !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setRecusa(null);
        }}
        recusa={recusa?.recusa ?? null}
        isPending={false}
        onConfirmar={({ customFields, wonReason }) => {
          if (!recusa) return;
          const { pipelineId, recusa: pendente } = recusa;
          setRecusa(null);
          movers.current.get(pipelineId)?.({
            ...pendente.args,
            customFields,
            ...(wonReason !== undefined ? { wonReason } : {}),
          });
        }}
      />
      {retomada && (
        <RetomarComoNovoNegocioDialog
          open
          onOpenChange={(aberto: boolean) => !aberto && setRetomada(null)}
          leadId={retomada.retomada.leadId}
          stageId={retomada.retomada.stageId}
          pipelineId={retomada.pipelineId}
        />
      )}
    </>
  );
}
