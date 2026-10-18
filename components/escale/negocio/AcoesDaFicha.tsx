"use client";
import Link from "next/link";
import { useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { Lead } from "@/lib/types/leads";
import {
  Bell,
  Calendar,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
} from "@/lib/ui/icons-da-casca";

import { JanelaDeNota } from "./JanelaDeNota";
import { TagsDaFicha } from "./TagsDaFicha";

/**
 * AS AÇÕES RÁPIDAS DA FICHA (fork Escale, Fase 1G, C3; print 01).
 *
 * Ligar, conversa e e-mail funcionam como na capa do card (1E); sem o dado, o
 * ícone fica apagado. Agendar e lembretes são atividades (1I); a nota abre o modal (1H, C15);
 * tags são do contato (1H, C10). Dicas: Q11.
 */
const ICONE =
  "grid size-7 place-items-center rounded-casca-gatilho text-casca-marca hover:bg-casca-raia [&_svg]:size-4";
const APAGADO =
  "grid size-7 place-items-center rounded-casca-gatilho text-casca-marca opacity-40 [&_svg]:size-4";
const EM_BREVE = "text-casca-marca disabled:pointer-events-auto disabled:cursor-not-allowed";

export function AcoesDaFicha({ lead, pipelineId }: { lead: Lead; pipelineId: string }) {
  const t = useT();
  const [nota, setNota] = useState(false);
  const telefone = lead.contact_phone?.trim() || null;
  const email = lead.contact_email?.trim() || null;
  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b border-casca-borda px-6">
      {telefone ? (
        <a href={`tel:${telefone}`} aria-label={t("Ligar")} title={t("Ligar")} className={ICONE}>
          <Phone aria-hidden />
        </a>
      ) : (
        <span
          role="img"
          aria-label={t("Sem telefone")}
          title={t("Sem telefone")}
          className={APAGADO}
        >
          <Phone aria-hidden />
        </span>
      )}
      {lead.conversa ? (
        <Link
          href={`/app/inbox?id=${lead.conversa.id}`}
          aria-label={t("Enviar Whatsapp")}
          title={t("Enviar Whatsapp")}
          className={ICONE}
        >
          <MessageCircle aria-hidden />
        </Link>
      ) : (
        <span
          role="img"
          aria-label={t("Sem conversa")}
          title={t("Sem conversa")}
          className={APAGADO}
        >
          <MessageCircle aria-hidden />
        </span>
      )}
      {email ? (
        <a
          href={`mailto:${email}`}
          aria-label={t("Enviar Email")}
          title={t("Enviar Email")}
          className={ICONE}
        >
          <Mail aria-hidden />
        </a>
      ) : (
        <span role="img" aria-label={t("Sem e-mail")} title={t("Sem e-mail")} className={APAGADO}>
          <Mail aria-hidden />
        </span>
      )}
      <BotaoDaCasca
        variante="icone"
        disabled
        title={t("Em breve")}
        aria-label={t("Agendar")}
        className={EM_BREVE}
      >
        <Calendar aria-hidden />
      </BotaoDaCasca>
      <BotaoDaCasca
        variante="icone"
        title={t("Nova nota")}
        aria-label={t("Nova nota")}
        onClick={() => setNota(true)}
        className="text-casca-marca"
      >
        <StickyNote aria-hidden />
      </BotaoDaCasca>
      <BotaoDaCasca
        variante="icone"
        disabled
        title={t("Em breve")}
        aria-label={t("Lembretes")}
        className={EM_BREVE}
      >
        <Bell aria-hidden />
      </BotaoDaCasca>
      {/* A `key` zera a busca e o pedido de remover ao trocar de negócio. */}
      <TagsDaFicha key={`tags-${lead.id}`} lead={lead} pipelineId={pipelineId} />
      <JanelaDeNota leadId={lead.id} aberta={nota} onFechar={() => setNota(false)} />
    </div>
  );
}
