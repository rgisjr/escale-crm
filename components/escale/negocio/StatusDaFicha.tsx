"use client";
import { useState } from "react";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";

import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { RetomarComoNovoNegocioDialog } from "@/components/kanban/RetomarComoNovoNegocioDialog";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useMotivosDePerdaDoFunil } from "@/hooks/kanban/useMotivosDePerdaDoFunil";
import { useMoveCard, type RetomadaPendente } from "@/hooks/kanban/useMoveCard";
import { useLoseLead, useWinLead } from "@/hooks/kanban/useUpdateLead";
import { etapaParaReabrir, type StatusDoNegocio } from "@/lib/escale/negocio/regras";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import {
  Check,
  ChevronDown,
  ChevronUp,
  CheckCircle2 as CircleCheck,
  CircleMinus,
  CircleX,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O STATUS NO CABEÇALHO DA FICHA (fork Escale, Fase 1G, C4; prints 01 e 08).
 *
 * Sobre o motor do original (N6, regra 4 do roteiro): Ganho = `POST /win`;
 * Perdido = escolher o motivo ao lado e só então `POST /lose`; Aberto num
 * negócio fechado = mover para uma etapa aberta (Q3), com a janela "Retomar
 * como novo negócio" quando a origem pede. Erros caem no aviso de sempre
 * (`showApiError`), inclusive o de campo obrigatório ao ganhar ou perder.
 */
const STATUS: ReadonlyArray<{
  valor: StatusDoNegocio;
  rotulo: string;
  Icone: LucideIcon;
  cor: string;
  item: string;
}> = [
  {
    valor: "open",
    rotulo: "Aberto",
    Icone: CircleMinus,
    cor: "text-casca-marca",
    item: "text-casca-marca hover:text-casca-marca data-[highlighted]:text-casca-marca",
  },
  {
    valor: "won",
    rotulo: "Ganho",
    Icone: CircleCheck,
    cor: "text-(--escale-status-ganho)",
    item: "text-(--escale-status-ganho) hover:text-(--escale-status-ganho) data-[highlighted]:text-(--escale-status-ganho)",
  },
  {
    valor: "lost",
    rotulo: "Perdido",
    Icone: CircleX,
    cor: "text-(--escale-status-perdido)",
    item: "text-(--escale-status-perdido) hover:text-(--escale-status-perdido) data-[highlighted]:text-(--escale-status-perdido)",
  },
];

export function StatusDaFicha({
  lead,
  stages,
  pipelineId,
}: {
  lead: Lead;
  stages: Stage[];
  pipelineId: string;
}) {
  const t = useT();
  const pode = usePermission("pipeline.move_card");
  const ganhar = useWinLead(pipelineId);
  const perder = useLoseLead(pipelineId);
  const [retomada, setRetomada] = useState<RetomadaPendente | null>(null);
  const mover = useMoveCard(pipelineId, { onRetomada: setRetomada });
  const motivos = useMotivosDePerdaDoFunil(pipelineId);
  const [aberto, setAberto] = useState(false);
  const [pairando, setPairando] = useState(false);
  const [pedindoMotivo, setPedindoMotivo] = useState(false);
  const atual = STATUS.find((s) => s.valor === lead.status) ?? STATUS[0]!;
  const expandido = aberto || pairando || lead.status !== "open";
  const ocupado = ganhar.isPending || perder.isPending || mover.isPending;

  const escolher = (novo: StatusDoNegocio) => {
    setAberto(false);
    if (novo === "lost") {
      if (lead.status !== "lost") setPedindoMotivo(true);
      return;
    }
    setPedindoMotivo(false);
    if (novo === lead.status) return;
    if (novo === "won") {
      ganhar.mutate({ leadId: lead.id });
      return;
    }
    const etapa = etapaParaReabrir(stages, lead.status);
    if (etapa)
      mover.mutate({
        leadId: lead.id,
        stageId: etapa,
        positionInStage: 0,
        expectedUpdatedAt: lead.updated_at,
      });
  };

  const perdido = lead.status === "lost";
  const opcoesDoMotivo = [
    ...new Set([...(lead.lost_reason ? [lead.lost_reason] : []), ...motivos]),
  ].map((m) => ({
    valor: m,
    rotulo: m,
  }));

  return (
    <div className="flex items-center gap-3">
      <DropdownMenu modal={false} open={aberto} onOpenChange={setAberto}>
        <DropdownMenuTrigger asChild disabled={!pode || ocupado}>
          <button
            type="button"
            aria-label={t("Status do negócio")}
            title={
              pode ? undefined : t("As permissões de usuários não permitem você trocar de status.")
            }
            onMouseEnter={() => setPairando(true)}
            onMouseLeave={() => setPairando(false)}
            className={cn(
              "flex h-8 items-center gap-2 rounded-md border px-2.5 text-[11px] disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60",
              aberto ? "border-casca-marca" : "border-casca-borda",
              expandido ? atual.cor : "text-casca-suave",
            )}
          >
            <atual.Icone size={14} aria-hidden />
            {expandido ? <span className="min-w-[44px] text-left">{t(atual.rotulo)}</span> : null}
            {aberto ? (
              <ChevronUp size={14} aria-hidden className="text-casca-texto" />
            ) : (
              <ChevronDown size={14} aria-hidden className="text-casca-texto" />
            )}
          </button>
        </DropdownMenuTrigger>
        <MenuPrimitive.Portal>
          <MenuPrimitive.Content
            align="end"
            sideOffset={8}
            className={cn(CAIXA_DO_MENU, "min-w-[118px]")}
          >
            {STATUS.map((s) => (
              <MenuPrimitive.Item
                key={s.valor}
                className={cn(ITEM_DO_MENU, s.item, s.valor === lead.status && "bg-casca-raia")}
                onSelect={() => escolher(s.valor)}
              >
                <s.Icone size={14} aria-hidden />
                {t(s.rotulo)}
                {s.valor === lead.status ? (
                  <Check size={14} aria-hidden className="ml-auto" />
                ) : null}
              </MenuPrimitive.Item>
            ))}
          </MenuPrimitive.Content>
        </MenuPrimitive.Portal>
      </DropdownMenu>
      {pedindoMotivo || perdido ? (
        <SeletorDaCasca
          aparencia="janela"
          className="w-60"
          valor={perdido ? (lead.lost_reason ?? "") : ""}
          opcoes={opcoesDoMotivo}
          vazio={t("Selecione o motivo da perda")}
          vazioSoNoGatilho
          aria-label={t("Selecione o motivo da perda")}
          desabilitado={perdido || perder.isPending}
          dica={perdido ? t("Para trocar o motivo, reabra o negócio.") : undefined}
          aoMudar={(motivo) => {
            if (motivo)
              perder.mutate(
                { leadId: lead.id, lostReason: motivo },
                { onSuccess: () => setPedindoMotivo(false) },
              );
          }}
        />
      ) : null}
      {retomada ? (
        <RetomarComoNovoNegocioDialog
          open
          onOpenChange={(v: boolean) => !v && setRetomada(null)}
          leadId={retomada.leadId}
          stageId={retomada.stageId}
          pipelineId={pipelineId}
        />
      ) : null}
    </div>
  );
}
