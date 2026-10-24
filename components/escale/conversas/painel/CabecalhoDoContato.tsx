"use client";
import Link from "next/link";
import { useState } from "react";

import { JanelaDeNota } from "@/components/escale/negocio/JanelaDeNota";
import { TagsDaFicha } from "@/components/escale/negocio/TagsDaFicha";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { JanelaMensagensAgendadasDoContato } from "@/components/escale/conversas/agendadas/JanelaMensagensAgendadasDoContato";
import { useContagemDeAgendadas } from "@/hooks/escale/useMensagensAgendadas";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { rotuloDoContato } from "@/lib/contacts/rotulo-do-contato";
import type { Lead } from "@/lib/types/leads";
import {
  Bell,
  AlarmClock,
  CalendarClock,
  Mail,
  Phone,
  StickyNote,
  User,
} from "@/lib/ui/icons-da-casca";

import { FotoDaConversa } from "../fila/FotoDaConversa";

const ICONE =
  "text-casca-marca disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-40";

/** O cabeçalho do contato (c02): foto, nome, tags e as ações rápidas; "Abrir contato" à direita. */
export function CabecalhoDoContato({
  conversa,
  lead,
  pipelineId,
}: {
  conversa: ConversationWithContact;
  lead: Lead | null;
  pipelineId: string | null;
}) {
  const t = useT();
  const [nota, setNota] = useState(false);
  const [agendadas, setAgendadas] = useState(false);
  const quantasAgendadas = useContagemDeAgendadas([conversa.id])[conversa.id] ?? 0;
  const contato = conversa.contacts ?? null;
  const nome = rotuloDoContato(contato, t);
  const telefone = contato?.phone_number ?? null;
  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="flex items-start gap-3">
        <FotoDaConversa conversa={conversa} tamanho="topo" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="truncate text-[13px] font-medium text-casca-texto">{nome}</h2>
          {lead && pipelineId ? (
            <TagsDaFicha key={`tags-${lead.id}`} lead={lead} pipelineId={pipelineId} />
          ) : (
            <span className="text-[12px] text-casca-meta">{(contato?.tags ?? []).join(" · ")}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {telefone ? (
          <a
            href={`tel:${telefone}`}
            aria-label={t("Ligar")}
            title={t("Ligar")}
            className="grid size-6 place-items-center rounded-casca-gatilho text-casca-marca hover:bg-casca-raia"
          >
            <Phone size={16} aria-hidden />
          </a>
        ) : (
          <BotaoDaCasca
            variante="icone"
            tamanho="sm"
            disabled
            title={t("Sem telefone")}
            aria-label={t("Ligar")}
            className={ICONE}
          >
            <Phone size={16} aria-hidden />
          </BotaoDaCasca>
        )}
        <span className="relative">
          <BotaoDaCasca
            variante="icone"
            tamanho="sm"
            title={t("Mensagens agendadas")}
            aria-label={t("Mensagens agendadas")}
            className={ICONE}
            onClick={() => setAgendadas(true)}
          >
            <AlarmClock size={16} aria-hidden />
          </BotaoDaCasca>
          {quantasAgendadas > 0 ? (
            <span className="pointer-events-none absolute -top-0.5 -right-0.5 grid size-3.5 place-items-center rounded-full bg-casca-marca text-[9px] font-semibold text-white">
              {quantasAgendadas}
            </span>
          ) : null}
        </span>
        <BotaoDaCasca
          variante="icone"
          tamanho="sm"
          disabled
          title={t("Em breve")}
          aria-label={t("Enviar Email")}
          className={ICONE}
        >
          <Mail size={16} aria-hidden />
        </BotaoDaCasca>
        <BotaoDaCasca
          variante="icone"
          tamanho="sm"
          disabled
          title={t("Em breve")}
          aria-label={t("Lembretes")}
          className={ICONE}
        >
          <Bell size={16} aria-hidden />
        </BotaoDaCasca>
        <BotaoDaCasca
          variante="icone"
          tamanho="sm"
          disabled
          title={t("Em breve")}
          aria-label={t("Nova atividade")}
          className={ICONE}
        >
          <CalendarClock size={16} aria-hidden />
        </BotaoDaCasca>
        <BotaoDaCasca
          variante="icone"
          tamanho="sm"
          disabled={!lead}
          title={lead ? t("Nova nota") : t("Sem negócio")}
          aria-label={t("Nova nota")}
          onClick={() => setNota(true)}
          className={ICONE}
        >
          <StickyNote size={16} aria-hidden />
        </BotaoDaCasca>
        <span className="flex-1" />
        {contato?.id ? (
          <Link
            href={`/app/contacts/${contato.id}`}
            aria-label={t("Abrir contato")}
            title={t("Abrir contato")}
            className="grid size-6 place-items-center rounded-casca-gatilho text-casca-marca hover:bg-casca-raia"
          >
            <User size={16} aria-hidden />
          </Link>
        ) : null}
      </div>
      <JanelaMensagensAgendadasDoContato
        aberta={agendadas}
        aoFechar={() => setAgendadas(false)}
        conversationId={conversa.id}
        contatoNome={nome}
      />
      {lead ? (
        <JanelaDeNota alvo={{ tipo: "negocio", id: lead.id }} aberta={nota} onFechar={() => setNota(false)} />
      ) : null}
    </div>
  );
}
