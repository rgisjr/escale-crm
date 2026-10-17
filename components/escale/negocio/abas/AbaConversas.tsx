"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { dataDaMensagem } from "@/lib/escale/quadro/aparencia";
import type { Lead } from "@/lib/types/leads";
import { CheckCheck, Glasses, MessagesSquare } from "@/lib/ui/icons-da-casca";

import { FotoDaFicha } from "../FotoDaFicha";

/**
 * A ABA CONVERSAS DA FICHA (fork Escale, Fase 1G, C2; print 05).
 *
 * Hoje o negócio traz só a conversa mais recente do contato; ela abre no Inbox
 * (o comportamento de sempre). Todas as conversas, os filtros e o modo espião
 * são da 1H (C16); abrir a conversa aqui dentro é da Fase 3 (C22).
 */
export function AbaConversas({ lead }: { lead: Lead }) {
  const t = useT();
  const conversa = lead.conversa ?? null;
  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-6">
      <div className="flex h-10 shrink-0 items-center justify-between rounded-t-lg bg-casca-raia px-4 text-[13px] text-casca-texto-2">
        <span className="flex items-center gap-2">
          <Glasses size={16} aria-hidden />
          {t("Abra as conversas sem marcá-las como lidas.")}
        </span>
        <button
          type="button"
          disabled
          title={t("Em breve")}
          className="text-[13px] text-casca-marca underline disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          {t("Ativar modo espião")}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 rounded-b-lg border border-t-0 border-casca-borda">
        <div className="w-[337px] shrink-0 overflow-y-auto border-r border-casca-borda">
          {conversa ? (
            <>
              <p className="px-3 py-3 text-xs font-medium text-casca-texto">{`1 ${t("sessões")}`}</p>
              <Link
                href={`/app/inbox?id=${conversa.id}`}
                className="flex items-center gap-3 border-b border-casca-borda px-3 py-3 hover:bg-casca-raia"
              >
                <FotoDaFicha lead={lead} tamanho="conversa" />
                <span className="min-w-0 flex-1">
                  <span className="flex justify-end text-[11px] text-casca-meta">
                    {dataDaMensagem(conversa.last_message_at)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-casca-texto-2">
                    <CheckCheck size={14} aria-hidden className="shrink-0" />
                    <span className="truncate">{conversa.preview ?? t("Sem mensagem")}</span>
                  </span>
                </span>
                {conversa.unread > 0 ? (
                  <span className="rounded-sm bg-casca-novo px-1.5 text-[11px] font-semibold text-white">
                    {conversa.unread}
                  </span>
                ) : null}
              </Link>
            </>
          ) : (
            <p className="px-3 py-6 text-xs text-casca-suave">
              {t("Este contato não possui conversas no atendimento")}
            </p>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 text-center">
          <span className="grid size-20 place-items-center rounded-2xl bg-casca-marca-suave text-casca-marca">
            <MessagesSquare size={32} aria-hidden />
          </span>
          <p className="mt-2 text-[17px] font-semibold text-casca-texto">
            {t("Selecione uma conversa")}
          </p>
          <p className="max-w-[210px] text-[15px] text-casca-suave">
            {t("Escolha uma conversa ao lado para ver as mensagens.")}
          </p>
        </div>
      </div>
    </div>
  );
}
