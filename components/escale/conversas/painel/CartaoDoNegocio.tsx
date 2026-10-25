"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { JanelaNovoNegocio } from "@/components/escale/contatos/JanelaNovoNegocio";
import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { DonoDaFicha } from "@/components/escale/negocio/DonoDaFicha";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import type { NegocioDoContato } from "@/hooks/escale/useNegociosDoContato";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useMotivosDePerdaDoFunil } from "@/hooks/kanban/useMotivosDePerdaDoFunil";
import { useMoveCard, type RetomadaPendente } from "@/hooks/kanban/useMoveCard";
import { useLoseLead, useWinLead } from "@/hooks/kanban/useUpdateLead";
import { RetomarComoNovoNegocioDialog } from "@/components/kanban/RetomarComoNovoNegocioDialog";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { textoDeReais } from "@/lib/escale/negocio/campos";
import { etapaParaReabrir, rotaDoNegocio } from "@/lib/escale/negocio/regras";
import { OUTRO, opcoesDeMotivoDePerda } from "@/lib/leads/motivos-de-perda-do-funil";
import { resolveLeadOwner } from "@/lib/kanban/owner";
import { rotuloDoMotivoDePerda } from "@/lib/schemas/leads";
import type { Pipeline, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleX,
  ExternalLink,
  Plus,
  UserRoundPlus,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const EYEBROW = "text-[11px] font-semibold tracking-wide text-casca-sobrelinha uppercase";
const BOTAO_DE_STATUS =
  "flex h-7 flex-1 items-center justify-center gap-1 rounded-casca-gatilho border text-[14px] disabled:pointer-events-auto disabled:cursor-not-allowed";

/**
 * "NEGÓCIOS" E O CARTÃO (fork Escale, Fase 3A; D3; c02, c48, 003). As mesmas
 * mutations da ficha (`StatusDaFicha`): ganhar, perder com motivo, reabrir
 * para a etapa certa, mover de etapa. Sem negócio, só "Adicionar negócio".
 */
export function CartaoDoNegocio({
  lead,
  pipeline,
  stages,
  negocios,
  aoEscolher,
  contato,
  origens,
}: {
  lead: Lead | null;
  pipeline: Pipeline | null;
  stages: Stage[];
  negocios: NegocioDoContato[];
  aoEscolher: (id: string) => void;
  contato: LinhaDeContato | null;
  origens: OrigemParaCriar[];
}) {
  const t = useT();
  const [novo, setNovo] = useState(false);
  const [escolhendo, setEscolhendo] = useState(false);
  const abertos = negocios.filter((n) => n.status === "open").length;

  return (
    <section className="pb-4">
      <div className="flex h-8 items-center justify-between">
        <span className={cn(EYEBROW, "flex items-center gap-2")}>
          {t("Negócios")}
          {negocios.length > 0 ? (
            <span className="grid size-4 place-items-center rounded-full bg-casca-marca text-[11px] font-semibold text-white normal-case">
              {abertos}
            </span>
          ) : null}
        </span>
        <span className="flex items-center gap-1">
          {negocios.length > 1 ? (
            <Popover open={escolhendo} onOpenChange={setEscolhendo}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-6 items-center gap-1 rounded-casca-gatilho px-2 text-[12px] text-casca-marca hover:bg-casca-raia"
                >
                  {t("Selecionar negócio")}
                  <ChevronDown size={12} aria-hidden />
                </button>
              </PopoverTrigger>
              <PainelSuspenso align="end" className="w-[260px] p-1">
                <ul role="listbox" aria-label={t("Selecionar negócio")}>
                  {negocios.map((n) => (
                    <li key={n.id} role="option" aria-selected={n.id === lead?.id}>
                      <button
                        type="button"
                        onClick={() => {
                          aoEscolher(n.id);
                          setEscolhendo(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[14px]",
                          n.id === lead?.id
                            ? "bg-casca-raia text-casca-marca"
                            : "text-casca-texto hover:bg-casca-raia",
                        )}
                      >
                        <span className="truncate">
                          {n.origem.grupo ? `${n.origem.grupo} › ` : ""}
                          {n.origem.nome}
                        </span>
                        {n.id === lead?.id ? <Check size={14} aria-hidden /> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </PainelSuspenso>
            </Popover>
          ) : null}
          {lead ? (
            <button
              type="button"
              aria-label={t("Adicionar negócio")}
              title={contato ? t("Adicionar negócio") : t("Sem contato")}
              disabled={!contato}
              onClick={() => setNovo(true)}
              className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={16} aria-hidden />
            </button>
          ) : null}
        </span>
      </div>

      {lead && pipeline ? (
        <Cartao
          lead={lead}
          pipeline={pipeline}
          stages={stages}
          negocio={negocios.find((n) => n.id === lead.id) ?? null}
        />
      ) : (
        <button
          type="button"
          disabled={!contato}
          title={contato ? undefined : t("Sem contato")}
          onClick={() => setNovo(true)}
          className="flex h-8 w-full items-center justify-center gap-2 rounded-casca-gatilho border border-casca-borda text-[14px] text-casca-marca hover:bg-casca-raia disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("Adicionar negócio")}
          <UserRoundPlus size={14} aria-hidden />
        </button>
      )}
      <JanelaNovoNegocio
        contato={novo ? contato : null}
        aoFechar={() => setNovo(false)}
        origens={origens}
      />
    </section>
  );
}

function Cartao({
  lead,
  pipeline,
  stages,
  negocio,
}: {
  lead: Lead;
  pipeline: Pipeline;
  stages: Stage[];
  negocio: NegocioDoContato | null;
}) {
  const t = useT();
  const pode = usePermission("pipeline.move_card");
  const ganhar = useWinLead(pipeline.id);
  const perder = useLoseLead(pipeline.id);
  const [retomada, setRetomada] = useState<RetomadaPendente | null>(null);
  const mover = useMoveCard(pipeline.id, { onRetomada: setRetomada });
  const motivos = useMotivosDePerdaDoFunil(pipeline.id);
  const { data: membros } = useAssignableMembers(true);
  const [pedindoMotivo, setPedindoMotivo] = useState(false);
  const [etapaAberta, setEtapaAberta] = useState(false);
  const ocupado = ganhar.isPending || perder.isPending || mover.isPending;

  const abertas = stages
    .filter((s) => !s.is_archived && !s.is_won && !s.is_lost)
    .sort((a, b) => a.position - b.position);
  const indice = abertas.findIndex((s) => s.id === lead.stage_id);
  const etapa = abertas[indice] ?? stages.find((s) => s.id === lead.stage_id) ?? null;
  const dono = resolveLeadOwner(
    lead,
    new Map((membros ?? []).map((m) => [m.user_id, m.full_name])),
  );
  const perdido = lead.status === "lost";
  const opcoesBase = opcoesDeMotivoDePerda(motivos).map((o) => ({
    valor: o.valor,
    rotulo: o.doFunil ? o.valor : t(rotuloDoMotivoDePerda(o.valor)),
  }));
  const opcoesDoMotivo =
    lead.lost_reason && !opcoesBase.some((o) => o.valor === lead.lost_reason)
      ? [
          { valor: lead.lost_reason, rotulo: t(rotuloDoMotivoDePerda(lead.lost_reason)) },
          ...opcoesBase,
        ]
      : opcoesBase;

  const reabrir = () => {
    const destino = etapaParaReabrir(stages, lead.status);
    if (!destino) return toast.error(t("Não há etapa aberta para reabrir este negócio."));
    mover.mutate({
      leadId: lead.id,
      stageId: destino,
      positionInStage: 0,
      expectedUpdatedAt: lead.updated_at,
    });
  };
  const dica = !pode
    ? t("As permissões de usuários não permitem você trocar de status.")
    : ocupado
      ? t("Salvando…")
      : undefined;

  return (
    <div className="rounded-[8px] border border-casca-borda p-4">
      <div className="flex items-center justify-between gap-2 text-[14px] text-casca-suave">
        <span className="flex min-w-0 items-center gap-1">
          {negocio?.origem.grupo ? (
            <>
              <span className="truncate">{negocio.origem.grupo}</span>
              <ChevronRight size={12} aria-hidden className="shrink-0" />
            </>
          ) : null}
          <span className="truncate font-medium text-casca-texto">
            {negocio?.origem.nome ?? pipeline.name}
          </span>
        </span>
        <Link
          href={rotaDoNegocio(lead.id, "", {})}
          aria-label={t("Ir para negócio")}
          title={t("Ir para negócio")}
          className="grid size-6 shrink-0 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
        >
          <ExternalLink size={14} aria-hidden />
        </Link>
      </div>
      <div className="mt-3 flex gap-0.5" aria-hidden>
        {abertas.map((s, i) => (
          <span
            key={s.id}
            className={cn(
              "h-1 flex-1 rounded-[2px]",
              i <= indice ? "bg-casca-marca" : "bg-casca-borda",
            )}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Popover open={etapaAberta} onOpenChange={setEtapaAberta}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={!pode || ocupado || perdido || lead.status === "won"}
              title={
                dica ??
                (perdido || lead.status === "won"
                  ? t("Reabra o negócio para mudar a etapa.")
                  : undefined)
              }
              className="flex items-center gap-1 text-[14px] font-medium text-casca-texto disabled:cursor-not-allowed"
            >
              {etapa?.name ?? t("Sem etapa")}
              <ChevronDown size={14} aria-hidden className="text-casca-chevron" />
            </button>
          </PopoverTrigger>
          <PainelSuspenso align="start" className="max-h-[370px] w-[220px] overflow-y-auto p-1">
            <ul role="listbox" aria-label={t("Etapa")}>
              {abertas.map((s) => (
                <li key={s.id} role="option" aria-selected={s.id === lead.stage_id}>
                  <button
                    type="button"
                    onClick={() => {
                      setEtapaAberta(false);
                      if (s.id !== lead.stage_id)
                        mover.mutate({
                          leadId: lead.id,
                          stageId: s.id,
                          positionInStage: 0,
                          expectedUpdatedAt: lead.updated_at,
                        });
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[14px]",
                      s.id === lead.stage_id
                        ? "bg-casca-raia text-casca-marca"
                        : "text-casca-texto hover:bg-casca-raia",
                    )}
                  >
                    {s.name}
                    {s.id === lead.stage_id ? <Check size={14} aria-hidden /> : null}
                  </button>
                </li>
              ))}
            </ul>
          </PainelSuspenso>
        </Popover>
        <span className="text-[12px] text-casca-suave">{`${indice + 1}/${abertas.length}`}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className={EYEBROW}>{t("Valor")}</p>
          <p className="mt-1 text-[15px] font-semibold text-casca-texto">{`R$ ${textoDeReais((lead.value_cents ?? 0) / 100)}`}</p>
        </div>
        <div>
          <p className={EYEBROW}>{t("Dono")}</p>
          <div className="mt-1 flex items-center gap-2">
            <DonoDaFicha
              key={`dono-${lead.id}`}
              lead={lead}
              pipelineId={pipeline.id}
              settings={pipeline.settings}
            />
            <span className="truncate text-[14px] text-casca-texto">
              {dono.name ?? t("Sem responsável")}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          aria-pressed={lead.status === "won"}
          disabled={!pode || ocupado}
          title={dica}
          onClick={() => lead.status !== "won" && ganhar.mutate({ leadId: lead.id })}
          className={cn(
            BOTAO_DE_STATUS,
            lead.status === "won"
              ? "border-(--escale-status-ganho) text-(--escale-status-ganho)"
              : "border-casca-borda text-casca-texto hover:bg-casca-raia",
          )}
        >
          {lead.status === "won" ? <CheckCircle2 size={14} aria-hidden /> : null}
          {t("Ganho")}
        </button>
        <button
          type="button"
          aria-pressed={perdido}
          disabled={!pode || ocupado}
          title={dica}
          onClick={() => !perdido && setPedindoMotivo(true)}
          className={cn(
            BOTAO_DE_STATUS,
            perdido || pedindoMotivo
              ? "border-casca-alerta text-casca-alerta"
              : "border-casca-borda text-casca-texto hover:bg-casca-raia",
          )}
        >
          {perdido || pedindoMotivo ? <CircleX size={14} aria-hidden /> : null}
          {t("Perdido")}
        </button>
        <button
          type="button"
          aria-pressed={lead.status === "open"}
          disabled={!pode || ocupado}
          title={dica}
          onClick={() => {
            setPedindoMotivo(false);
            if (lead.status !== "open") reabrir();
          }}
          className={cn(
            BOTAO_DE_STATUS,
            lead.status === "open" && !pedindoMotivo
              ? "border-casca-marca text-casca-marca"
              : "border-casca-borda text-casca-texto hover:bg-casca-raia",
          )}
        >
          {lead.status === "open" && !pedindoMotivo ? <CheckCircle2 size={14} aria-hidden /> : null}
          {t("Aberto")}
        </button>
      </div>
      {pedindoMotivo || perdido ? (
        <div className="mt-2">
          <SeletorDaCasca
            aparencia="janela"
            className="h-8"
            valor={perdido ? (lead.lost_reason ?? "") : ""}
            opcoes={opcoesDoMotivo}
            vazio={t("Não informar")}
            aria-label={t("Motivo da perda")}
            desabilitado={perdido || perder.isPending}
            dica={
              perdido
                ? t("Para trocar o motivo, reabra o negócio.")
                : perder.isPending
                  ? t("Salvando…")
                  : undefined
            }
            // "Não informar" (a linha vazia do seletor) grava "Outro motivo": o banco
            // exige um motivo para perder (CHECK crm_leads_lost_reason_required).
            aoMudar={(motivo) =>
              perder.mutate(
                { leadId: lead.id, lostReason: motivo || OUTRO },
                { onSuccess: () => setPedindoMotivo(false) },
              )
            }
          />
        </div>
      ) : null}
      {retomada ? (
        <RetomarComoNovoNegocioDialog
          open
          onOpenChange={(v: boolean) => !v && setRetomada(null)}
          leadId={retomada.leadId}
          stageId={retomada.stageId}
          pipelineId={pipeline.id}
        />
      ) : null}
    </div>
  );
}
