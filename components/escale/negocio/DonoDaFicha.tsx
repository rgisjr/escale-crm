"use client";
import { useState } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useAssignableAgents } from "@/hooks/kanban/useAssignableAgents";
import { useEditLead } from "@/hooks/kanban/useUpdateLead";
import { corDoAvatar, inicialDoNome } from "@/lib/escale/quadro/aparencia";
import { resolveLeadOwner } from "@/lib/kanban/owner";
import type { Lead } from "@/lib/types/leads";
import { User } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O DONO NO CABEÇALHO DA FICHA (fork Escale, Fase 1G, C5; print 10).
 *
 * "Alterar usuário" com "Sem responsável", as pessoas e os agentes de IA (Q5).
 * Grava pelo mesmo `PATCH /api/v1/leads/[id]` do ⋮ do card. Sem a permissão
 * `pipeline.move_card`, o círculo fica desligado com o texto da Clint.
 */
export function DonoDaFicha({ lead, pipelineId }: { lead: Lead; pipelineId: string }) {
  const t = useT();
  const pode = usePermission("pipeline.move_card");
  const { data: membros } = useAssignableMembers(true);
  const { data: agentes } = useAssignableAgents(pode);
  const editar = useEditLead(pipelineId);
  const [aberto, setAberto] = useState(false);
  const nomes = new Map((membros ?? []).map((m) => [m.user_id, m.full_name]));
  const dono = resolveLeadOwner(lead, nomes);
  const valor = lead.owner_agent_id
    ? `a:${lead.owner_agent_id}`
    : lead.owner_user_id
      ? `u:${lead.owner_user_id}`
      : "nenhum";
  const opcoes = [
    { valor: "nenhum", rotulo: t("Sem responsável") },
    ...(membros ?? []).map((m) => ({
      valor: `u:${m.user_id}`,
      rotulo: m.full_name ?? t("Sem nome"),
      grupo: t("Pessoas"),
    })),
    ...(agentes ?? []).map((a) => ({
      valor: `a:${a.agent_id}`,
      rotulo: a.name,
      grupo: t("Agentes de IA"),
    })),
  ];

  const mudar = (v: string) => {
    setAberto(false);
    if (!v || v === valor) return;
    const patch =
      v === "nenhum"
        ? lead.owner_agent_id
          ? { owner_agent_id: null }
          : { owner_user_id: null }
        : v.startsWith("a:")
          ? { owner_agent_id: v.slice(2) }
          : { owner_user_id: v.slice(2) };
    editar.mutate({ leadId: lead.id, patch });
  };

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("Alterar usuário")}
          disabled={!pode || editar.isPending}
          title={
            !pode
              ? t("As permissões de usuários não permitem você trocar de dono")
              : editar.isPending
                ? t("Salvando…")
                : (dono.name ?? t("Sem responsável"))
          }
          className="rounded-full disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          <CirculoDoDono
            id={lead.owner_user_id ?? lead.owner_agent_id}
            nome={dono.name}
            tipo={dono.kind}
          />
        </button>
      </PopoverTrigger>
      <PainelSuspenso align="end" sideOffset={8} className="w-[270px] p-3">
        <h5 className="mb-1 text-[11px] font-medium text-casca-texto">{t("Alterar usuário")}</h5>
        <SeletorDaCasca
          aparencia="janela"
          valor={valor}
          opcoes={opcoes}
          aoMudar={mudar}
          vazio={t("Selecione um usuário")}
          aria-label={t("Selecione um usuário")}
          desabilitado={editar.isPending}
          dica={editar.isPending ? t("Salvando…") : undefined}
        />
      </PainelSuspenso>
    </Popover>
  );
}

function CirculoDoDono({
  id,
  nome,
  tipo,
}: {
  id: string | null;
  nome: string | null;
  tipo: "user" | "ai" | null;
}) {
  if (!tipo) {
    return (
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-full bg-casca-cinza-selo text-white"
      >
        <User size={16} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 place-items-center rounded-full text-[13px] font-semibold",
        tipo === "ai" ? "border border-casca-marca bg-surface text-casca-marca" : "text-white",
      )}
      style={tipo === "ai" ? undefined : { backgroundColor: corDoAvatar(id ?? nome ?? "?") }}
    >
      {inicialDoNome(nome)}
    </span>
  );
}
