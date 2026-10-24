"use client";
import Link from "next/link";

import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import { ChatThread } from "@/components/inbox/ChatThread";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useT } from "@/hooks/i18n/useT";
import { ExternalLink } from "@/lib/ui/icons-da-casca";

/**
 * A CONVERSA DA DIREITA DA ABA CONVERSAS (fork Escale, Fase 2E; C4, N7; Clint
 * `ContactConversations` no modo "Padrão chat"). A thread do original em
 * leitura: sem `onResponder` (sem responder) e sem o `useMarkAsRead` (não marca
 * como lida). Responder daqui é da 3E; "Abrir em Conversas" leva ao Inbox.
 */
export function ConversaEmLeitura({
  conversa,
  contatoId,
}: {
  conversa: ConversationWithContact;
  contatoId: string;
}) {
  const t = useT();
  const canal = conversa.channel_sessions ?? null;
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-casca-borda px-4">
        <span className="flex min-w-0 items-center gap-2 text-[13px] text-casca-texto">
          <ChannelLogo channel={canal} size={16} />
          <span className="truncate">{canal?.display_name ?? ""}</span>
        </span>
        <Link
          href={`/app/inbox?id=${conversa.id}`}
          className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-casca-marca hover:underline"
        >
          {t("Abrir em Conversas")}
          <ExternalLink size={14} aria-hidden />
        </Link>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatThread conversationId={conversa.id} provider={canal?.provider ?? null} contatoId={contatoId} />
      </div>
    </div>
  );
}
