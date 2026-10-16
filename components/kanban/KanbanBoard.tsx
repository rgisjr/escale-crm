"use client";
import { useCallback, useMemo, useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "@/hooks/i18n/useT";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { chaveDoQuadro, useBoard } from "@/hooks/kanban/useBoard";
import { useMoveCard, type RecusaDeCampos, type RetomadaPendente } from "@/hooks/kanban/useMoveCard";
import { useRenameStage } from "@/hooks/kanban/useRenameStage";
import { CamposObrigatoriosDialog } from "./CamposObrigatoriosDialog";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useAtRiskLeads } from "@/hooks/leads/useAtRiskLeads";
import { useReactivations } from "@/hooks/leads/useReactivations";
import { midpoint } from "@/lib/kanban/fractional-indexing";
import { proximoNaEtapaInteira } from "@/lib/kanban/vizinho-na-etapa";
import type { Lead } from "@/lib/types/leads";
import type { BoardData, Pipeline, Stage } from "@/lib/kanban/types";
import { StageColumn } from "./StageColumn";
import { LeadDossier } from "./LeadDossier";
import { RetomarComoNovoNegocioDialog } from "./RetomarComoNovoNegocioDialog";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
// FORK ESCALE · Fase 1D: com ordenação ativa, soltar em outra etapa vai para o fim dela.
import { posicaoNoFimDaEtapa } from "@/lib/escale/filtros/ordenar";
// FORK ESCALE · Casca V4: com a casca nova, a coluna e o card da Clint (fork).
import { ColunaDoFunilNaCasca } from "@/components/escale/quadro/ColunaDoFunilNaCasca";
import { selecaoDaEtapa } from "@/lib/escale/quadro/selecao";
// FORK ESCALE · Fase 1E: os campos que o "Personalizar cards" oferece.
import { camposDaCapa } from "@/lib/escale/capa/tipos";

interface KanbanBoardProps {
  pipelineId: string;
  /** Optional override: if provided, skips internal useBoard fetch. */
  stages?: Stage[];
  leads?: Lead[];
  pipeline?: Pipeline;
  selectedIds?: string[];
  /**
   * Ids que chegaram por evento remoto, quando o board recebe os dados de fora.
   *
   * Quem assina o realtime é quem chama `useBoard` com o pipeline — e nesta
   * página é o _client, não este componente (aqui `useBoard(null)` fica
   * desligado por causa do `useExternal`). Sem esta prop o pulso nasce no lugar
   * certo e morre na fronteira: o dado vem por prop e o sinal ficava para trás.
   */
  pulses?: Map<string, number>;
  onSelectionChange?: (ids: string[]) => void;
  /** Lead a abrir já na montagem (deep link `?lead=` — ver o dossiê abaixo). */
  leadInicial?: string | null;
  /**
   * `manager`+ pode renomear a etapa direto no cabeçalho da coluna — mesmo
   * corte de papel da rota (`PATCH .../stages/:stageId`, `requireRole("manager")`).
   * `viewer`/`agent` também abrem este board (ele não é rota manager-only),
   * então o cabeçalho fica só leitura para eles.
   */
  podeRenomearEtapa?: boolean;
  /**
   * FORK ESCALE · Fase 1D: a ordenação escolhida na barra do quadro (casca
   * nova). Com ela, a coluna mostra os cards nessa ordem, arrastar DENTRO da
   * coluna não faz nada (a posição manual não é a ordem da tela) e soltar em
   * outra etapa põe o card no fim dela. Ausente = a ordem manual de sempre.
   */
  ordemDosCards?: (a: Lead, b: Lead) => number;
  /**
   * FORK ESCALE · Casca V4: "casca" troca a coluna e o card pelos da Clint
   * (`components/escale/quadro/`), com rolagem própria em cada coluna. Ausente =
   * o quadro do original, sem mudança nenhuma.
   */
  aparencia?: "casca";
  /** FORK ESCALE · Casca V4: o "+ Adicionar negócio" das colunas (só na casca). */
  aoAdicionarNegocio?: (stageId: string) => void;
  /**
   * FORK ESCALE · Fase 1E: o ⋮ da etapa na casca ("Selecionar todos..." e
   * "Selecione N"). Agent ou acima, o mesmo corte das ações em lote.
   */
  podeSelecionarNaEtapa?: boolean;
}

function groupLeadsByStage(
  stages: Stage[],
  leads: Lead[],
  ordem?: (a: Lead, b: Lead) => number,
): Map<string, Lead[]> {
  const map = new Map<string, Lead[]>();
  for (const stage of stages) map.set(stage.id, []);
  for (const lead of leads) {
    const bucket = map.get(lead.stage_id);
    if (bucket) bucket.push(lead);
  }
  // Already ordered by position_in_stage at fetch time, but be defensive.
  // FORK ESCALE · Fase 1D: com ordenação escolhida, ela manda.
  for (const list of map.values()) {
    list.sort(ordem ?? ((a, b) => a.position_in_stage - b.position_in_stage));
  }
  return map;
}

function BoardSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
      {[0, 1, 2].map((c) => (
        <div
          key={c}
          className="flex w-80 shrink-0 flex-col gap-2 rounded-lg border border-border bg-surface-muted/40 p-3"
        >
          <Skeleton className="h-5 w-32" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function KanbanBoard({
  pipelineId,
  stages: stagesProp,
  leads: leadsProp,
  pipeline: pipelineProp,
  selectedIds,
  pulses: pulsesProp,
  onSelectionChange,
  leadInicial,
  podeRenomearEtapa = false,
  ordemDosCards,
  aparencia,
  aoAdicionarNegocio,
  podeSelecionarNaEtapa = false,
}: KanbanBoardProps) {
  const t = useT();
  const useExternal = stagesProp !== undefined && leadsProp !== undefined;
  const queryResult = useBoard(useExternal ? null : pipelineId);
  // O funil INTEIRO, sem o filtro da página: com `leads` vindo de fora esse
  // `data.leads` é a lista já filtrada, e é do cache `chaveDoQuadro(pipelineId)`
  // — preenchido pela página sem filtro — que o `after` do arrasto é lido.
  const qc = useQueryClient();
  const renameStage = useRenameStage(pipelineId);
  // A RECUSA DE CAMPOS ABRE DIÁLOGO, não toast (issue #1536): o 422 traz em
  // `details.faltando` o que falta, o diálogo coleta, e o reenvio leva os
  // valores NA MESMA escrita que muda a etapa. O hook é o MESMO de antes —
  // esta opção só troca o destino do erro.
  const [recusaDeCampos, setRecusaDeCampos] = useState<RecusaDeCampos | null>(null);
  const [retomada, setRetomada] = useState<RetomadaPendente | null>(null);
  const moveCard = useMoveCard(pipelineId, {
    onCamposFaltando: setRecusaDeCampos,
    onRetomada: setRetomada,
  });
  const { data: members } = useAssignableMembers(true);
  const ownerNames = useMemo(
    () => new Map((members ?? []).map((m) => [m.user_id, m.full_name])),
    [members],
  );
  // Esfriando vem do MESMO radar que alimenta /app/radar — o board não
  // reclassifica nada (contrato §3.3). `em_voo` fica de fora: a IA já prometeu
  // voltar, então não há decisão pendente para o humano.
  const { data: atRisk } = useAtRiskLeads();
  // As propostas vivas vêm da MESMA forma que o risco: uma lista por org, que o
  // card consome sem saber de onde veio. Ver o cabeçalho da rota.
  const { data: propostasVivas } = useReactivations();
  const reactivations = useMemo(() => {
    const m = new Map<string, { proposalId: string; expiresAt: string }>();
    for (const p of propostasVivas ?? []) {
      m.set(p.lead_id, { proposalId: p.proposal_id, expiresAt: p.expires_at });
    }
    return m;
  }, [propostasVivas]);
  const coolingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of atRisk?.items ?? []) {
      if (item.pipeline_id !== pipelineId) continue;
      if (item.risk === "em_risco" || item.risk === "critico") ids.add(item.id);
    }
    return ids;
  }, [atRisk, pipelineId]);
  // A tag canônica do pipeline é a ÚNICA que fica no card (como ponto de 6px);
  // as outras saem para o hover. Já existe em settings — não inventa campo.
  const canonicalTags = useMemo(() => {
    const raw = (pipelineProp ?? queryResult.data?.pipeline)?.settings?.canonical_tags;
    return Array.isArray(raw) ? raw.filter((t): t is string => typeof t === "string") : [];
  }, [pipelineProp, queryResult.data?.pipeline]);
  // FORK ESCALE · Fase 1E: os campos que o "Personalizar cards" pode pôr no card da casca.
  const camposDoCard = useMemo(
    () => camposDaCapa([(pipelineProp ?? queryResult.data?.pipeline)?.settings ?? null]),
    [pipelineProp, queryResult.data?.pipeline],
  );

  // O dossiê é do BOARD e não da página: ele precisa do lead inteiro e do nome
  // do estágio, que só existem aqui depois do agrupamento.
  //
  // `leadInicial` é o deep link: até aqui o dossiê SÓ abria por clique, então
  // nenhuma outra tela do produto conseguia apontar para um lead específico —
  // o histórico de captação tinha o id e nenhum lugar para levá-lo. Uma vez
  // aberto, o estado local manda (fechar não reabre pela URL).
  const [dossieId, setDossieId] = useState<string | null>(leadInicial ?? null);
  const [internalSelected, setInternalSelected] = useState<Set<string>>(new Set());
  const selectedLeadIds = useMemo(
    () => (selectedIds ? new Set(selectedIds) : internalSelected),
    [selectedIds, internalSelected],
  );

  const data = useExternal
    ? {
        pipeline: pipelineProp ?? ({} as Pipeline),
        stages: stagesProp,
        leads: leadsProp,
      }
    : queryResult.data;
  const isLoading = useExternal ? false : queryResult.isLoading;
  const isError = useExternal ? false : queryResult.isError;
  const error = useExternal ? null : queryResult.error;

  const leadDoDossie = dossieId
    ? (data?.leads.find((l) => l.id === dossieId) ?? null)
    : null;

  const grouped = useMemo(() => {
    if (!data) return null;
    return groupLeadsByStage(data.stages, data.leads, ordemDosCards);
  }, [data, ordemDosCards]);

  // Um conjunto por vez, e não um card por vez: o board recebe o resultado do
  // gesto já resolvido pela coluna (um card, um intervalo, a etapa inteira). A
  // versão anterior só sabia alternar UM id, e é por isso que "selecionar tudo"
  // não existia — cada card exigia uma volta pelo estado.
  const handleSelectMany = useCallback(
    (leadIds: string[], marcar: boolean) => {
      const apply = (prev: Set<string>): Set<string> => {
        const next = new Set(prev);
        for (const id of leadIds) {
          if (marcar) next.add(id);
          else next.delete(id);
        }
        return next;
      };
      if (onSelectionChange) {
        onSelectionChange(Array.from(apply(selectedLeadIds)));
      } else {
        setInternalSelected((prev) => apply(prev));
      }
    },
    [onSelectionChange, selectedLeadIds],
  );

  // FORK ESCALE · Fase 1E: "Selecione N" troca a seleção da etapa numa conta só.
  const selecionarNaEtapa = useCallback(
    (ids: string[], n: number) => {
      if (onSelectionChange) onSelectionChange(Array.from(selecaoDaEtapa(ids, selectedLeadIds, n)));
      else setInternalSelected((prev) => selecaoDaEtapa(ids, prev, n));
    },
    [onSelectionChange, selectedLeadIds],
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!data || !grouped) return;
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      const lead = data.leads.find((l) => l.id === draggableId);
      if (!lead) return;

      const destStageId = destination.droppableId;

      // FORK ESCALE · Fase 1D: com ordenação ativa, a posição na coluna é a da
      // ordenação, não a do ponteiro. Mesma coluna = nada; outra coluna = fim da
      // etapa INTEIRA (o cache sem filtro, o mesmo cuidado da #2545 abaixo).
      if (ordemDosCards) {
        if (source.droppableId === destStageId) return;
        const etapaInteira = qc.getQueryData<BoardData>(chaveDoQuadro(pipelineId))?.leads ?? data.leads;
        moveCard.mutate({
          leadId: lead.id,
          stageId: destStageId,
          positionInStage: posicaoNoFimDaEtapa(etapaInteira, destStageId, lead.id),
          expectedUpdatedAt: lead.updated_at,
        });
        return;
      }
      const destList = (grouped.get(destStageId) ?? []).filter(
        (l) => l.id !== draggableId,
      );

      const before = destination.index > 0 ? destList[destination.index - 1] : null;
      // `destList` sai do `grouped`, que a página já FILTROU. O de cima fica
      // sendo o vizinho visível — foi o que o operador escolheu ao soltar; o de
      // baixo, porém, tem de ser o próximo card da etapa INTEIRA depois dele.
      // Tirado da lista filtrada, `midpoint` devolvia `último + 1000` no fim da
      // coluna visível (a posição nascida do card escondido) e, entre dois
      // visíveis, a média caía em cima do escondido do meio — os dois cards
      // ficavam com a MESMA `position_in_stage` e o arrasto seguinte entre eles
      // era cancelado em silêncio (issue #2545). O funil sem filtro mora no
      // cache do quadro, que a página preenche inteiro.
      const etapaInteira =
        qc
          .getQueryData<BoardData>(chaveDoQuadro(pipelineId))
          ?.leads.filter((l) => l.stage_id === destStageId) ?? null;
      const after = proximoNaEtapaInteira(
        before ?? null,
        destList[destination.index] ?? null,
        etapaInteira,
        draggableId,
      );

      const newPosition = midpoint(
        before?.position_in_stage ?? null,
        after?.position_in_stage ?? null,
      );

      if (Number.isNaN(newPosition)) {
        // Collision — Wave 8 will handle global rebalance. For now, abort silently.
        return;
      }

      moveCard.mutate({
        leadId: lead.id,
        stageId: destStageId,
        positionInStage: newPosition,
        expectedUpdatedAt: lead.updated_at,
      });
    },
    [data, grouped, moveCard, qc, pipelineId, ordemDosCards],
  );

  if (isLoading) {
    return <BoardSkeleton />;
  }

  if (isError) {
    return (
      <Card className="m-4 p-6 text-sm text-text-muted">
        {t("Falha ao carregar o board.")}
        {error instanceof Error ? ` ${error.message}` : null}
      </Card>
    );
  }

  if (!data || !grouped) {
    return null;
  }

  if (data.stages.length === 0) {
    return (
      <Card className="m-4 p-6 text-sm text-text-muted">
        {t("Nenhum lead nesta pipeline ainda.")}
      </Card>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* UM contêiner de rolagem só, nos dois eixos. Rolar cada coluna por
          conta própria seria o desenho "Trello", mas o @hello-pangea/dnd não
          suporta Droppable rolável dentro de outro contêiner rolável ("nested
          scroll containers are currently not supported") — o arraste perderia
          a rolagem automática. Com o quadro como único pai rolável, o arraste
          continua inteiro, e o cabeçalho de cada etapa fica preso em cima
          (`sticky` em StageColumn). `items-start` + `min-h-full` na coluna: a
          coluna curta ocupa a altura toda (dá para soltar card no vazio) e a
          comprida cresce com os cards, com o fundo acompanhando.
          Sem padding no ALTO, e é de propósito: o `sticky` prende o cabeçalho
          na borda do conteúdo do contêiner, então um `pt-4` deixava uma faixa
          de 16px acima dele por onde os cards apareciam rolando (medido no e2e
          "o quadro cabe na tela"). O respiro até os filtros vem do `gap-4` da
          página. */}
      <div
        className={
          // FORK ESCALE · Casca V4: na casca, cada coluna rola sozinha e o quadro só anda para o lado.
          aparencia === "casca"
            ? "flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto overflow-y-hidden pb-3"
            : "flex min-h-0 flex-1 items-start gap-3 overflow-auto px-4 pb-4"
        }
        data-quadro-do-funil
      >
        {data.stages.map((stage) =>
          // FORK ESCALE · Casca V4: as mesmas props, na coluna da Clint.
          aparencia === "casca" ? (
            <ColunaDoFunilNaCasca
              key={stage.id}
              stage={stage}
              leads={grouped.get(stage.id) ?? []}
              pipelineId={pipelineId}
              ownerNames={ownerNames}
              coolingIds={coolingIds}
              reactivations={reactivations}
              pulses={pulsesProp ?? queryResult.pulses}
              canonicalTags={canonicalTags}
              selectedLeadIds={selectedLeadIds}
              onSelectMany={handleSelectMany}
              onOpen={setDossieId}
              podeRenomear={podeRenomearEtapa}
              onRenomear={(nome) => renameStage.mutate({ stageId: stage.id, name: nome })}
              aoAdicionar={aoAdicionarNegocio}
              aoSelecionarNaEtapa={podeSelecionarNaEtapa ? selecionarNaEtapa : undefined}
              camposDoCard={camposDoCard}
              nomeDaOrigem={data.pipeline.name}
            />
          ) : (
          <StageColumn
            key={stage.id}
            stage={stage}
            leads={grouped.get(stage.id) ?? []}
            pipelineId={pipelineId}
            ownerNames={ownerNames}
            coolingIds={coolingIds}
            reactivations={reactivations}
            pulses={pulsesProp ?? queryResult.pulses}
            canonicalTags={canonicalTags}
            selectedLeadIds={selectedLeadIds}
            onSelectMany={handleSelectMany}
            onOpen={setDossieId}
            podeRenomear={podeRenomearEtapa}
            onRenomear={(nome) => renameStage.mutate({ stageId: stage.id, name: nome })}
          />
          ),
        )}
      </div>
      {leadDoDossie && (
        <LeadDossier
          open
          onOpenChange={(v: boolean) => !v && setDossieId(null)}
          lead={leadDoDossie}
          pipelineId={pipelineId}
          fieldDefs={camposDoFunil(data.pipeline.settings ?? null)}
          stageName={
            data.stages.find((s) => s.id === leadDoDossie.stage_id)?.name ?? "—"
          }
          ownerNames={ownerNames}
        />
      )}

      <CamposObrigatoriosDialog
        open={recusaDeCampos !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setRecusaDeCampos(null);
        }}
        recusa={recusaDeCampos}
        isPending={moveCard.isPending}
        onConfirmar={({ customFields, wonReason }) => {
          if (!recusaDeCampos) return;
          const { args } = recusaDeCampos;
          setRecusaDeCampos(null);
          moveCard.mutate({
            ...args,
            customFields,
            ...(wonReason !== undefined ? { wonReason } : {}),
          });
        }}
      />
      {retomada && (
        <RetomarComoNovoNegocioDialog
          open
          onOpenChange={(v: boolean) => !v && setRetomada(null)}
          leadId={retomada.leadId}
          stageId={retomada.stageId}
          pipelineId={pipelineId}
        />
      )}
    </DragDropContext>
  );
}
