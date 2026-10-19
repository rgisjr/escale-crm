"use client";
import { useEffect, useRef, useState } from "react";

import { ChatThread } from "@/components/inbox/ChatThread";
import { Composer, type ComposerHandle } from "@/components/inbox/Composer";
import { ConversationHeader } from "@/components/inbox/ConversationHeader";
import { JanelaFechadaAviso } from "@/components/inbox/JanelaFechadaAviso";
import { NumeroForaDoAr } from "@/components/inbox/NumeroForaDoAr";
import { RetentionNotice } from "@/components/inbox/RetentionNotice";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { estadoDaJanela } from "@/lib/channels/janela";
import { motivoDaJanelaFechada, motivoDoContato } from "@/lib/inbox/motivo-do-envio-bloqueado";
import type { AvisoDeRascunho } from "@/lib/inbox/rascunho-sugerido";
import type { Message } from "@/lib/types/messaging";
import { Search, X } from "@/lib/ui/icons-da-casca";

/**
 * A CONVERSA ABERTA NA CASCA (fork Escale, Fase 3A). Por enquanto é o
 * cabeçalho, a thread e o compositor do ORIGINAL, com as mesmas props que o
 * `InboxLayout` lhes dá (janela de 24h, bloqueios, rascunho sugerido). A 3B
 * troca os três pelos da Clint sem mexer na casca de fora.
 */
export function ConversaAberta({
  conversa,
  rascunho,
  aoAbrirConversa,
  aoAbrirFicha,
}: {
  conversa: ConversationWithContact;
  rascunho: AvisoDeRascunho | null;
  aoAbrirConversa: (id: string | null) => void;
  /** Só abaixo de `xl`: o botão "Ficha" abre o painel direito numa gaveta. */
  aoAbrirFicha?: () => void;
}) {
  const t = useT();
  const { user } = useAuth();
  const supportReadonly = user.support?.access_mode === "support_readonly";
  const composerRef = useRef<ComposerHandle | null>(null);
  const botaoBuscaRef = useRef<HTMLButtonElement | null>(null);
  const [busca, setBusca] = useState<{ conversaId: string; termo: string } | null>(null);
  const [respondendo, setRespondendo] = useState<Message | null>(null);
  const buscaAberta = busca !== null && busca.conversaId === conversa.id;

  // A janela vence sozinha com a aba aberta (mesma régua do original).
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const janela = estadoDaJanela(
    conversa.channel_sessions?.provider ?? null,
    conversa.last_inbound_at ?? null,
    agora,
  );
  const motivoDaJanela = motivoDaJanelaFechada(janela, conversa.channel_sessions?.provider, t);
  const bloqueio = motivoDoContato(conversa.contacts, t);
  const rascunhoVivo = rascunho && rascunho.conversationId === conversa.id ? rascunho : null;

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="conversa-aberta">
      {aoAbrirFicha ? (
        <div className="flex h-9 shrink-0 items-center justify-end border-b border-casca-borda px-2 xl:hidden">
          <BotaoDaCasca variante="texto" tamanho="sm" onClick={aoAbrirFicha}>
            {t("Ficha")}
          </BotaoDaCasca>
        </div>
      ) : null}
      <ConversationHeader
        key={conversa.id}
        conversation={conversa}
        onAbrirConversa={aoAbrirConversa}
        onBuscar={() =>
          buscaAberta ? setBusca(null) : setBusca({ conversaId: conversa.id, termo: "" })
        }
        buscaAberta={buscaAberta}
        botaoBuscaRef={botaoBuscaRef}
      />
      {buscaAberta ? (
        <div className="flex items-center gap-2 border-b border-casca-borda px-4 py-1.5">
          <Search size={16} aria-hidden className="shrink-0 text-casca-suave" />
          <input
            type="search"
            autoFocus
            className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
            aria-label={t("Buscar nas mensagens carregadas")}
            placeholder={t("Buscar nas mensagens carregadas")}
            value={busca.termo}
            onChange={(e) => setBusca({ conversaId: busca.conversaId, termo: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Escape") setBusca(null);
            }}
          />
          <BotaoDaCasca
            variante="icone"
            tamanho="sm"
            aria-label={t("Fechar busca")}
            onClick={() => setBusca(null)}
          >
            <X size={16} aria-hidden />
          </BotaoDaCasca>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden">
        <ChatThread
          conversationId={conversa.id}
          searchTerm={buscaAberta ? busca.termo : ""}
          provider={conversa.channel_sessions?.provider ?? null}
          onResponder={setRespondendo}
          dono={{
            userId: conversa.assigned_to_user_id ?? null,
            nome: conversa.assigned_to_user_name ?? null,
          }}
          contatoId={conversa.contacts?.id ?? null}
        />
      </div>
      <RetentionNotice conversationId={conversa.id} />
      {conversa.contacts?.id ? (
        <NumeroForaDoAr
          key={`numero:${conversa.id}`}
          conversationId={conversa.id}
          channelSessionId={conversa.channel_session_id}
          contactId={conversa.contacts.id}
          contactPhone={conversa.contacts.phone_number ?? null}
          onAbrirConversa={aoAbrirConversa}
        />
      ) : null}
      {motivoDaJanela ? (
        <JanelaFechadaAviso
          conversationId={conversa.id}
          provider={conversa.channel_sessions?.provider ?? null}
          motivo={motivoDaJanela}
        />
      ) : null}
      <Composer
        key={rascunhoVivo ? `rascunho:${rascunhoVivo.conversationId}` : `composer:${conversa.id}`}
        ref={composerRef}
        conversationId={conversa.id}
        blockedReason={supportReadonly ? t("Acompanhamento somente leitura") : bloqueio}
        janelaFechada={motivoDaJanela}
        disabled={conversa.status === "closed"}
        contactName={conversa.contacts?.name ?? null}
        contactDisplayName={conversa.contacts?.display_name}
        respondendo={respondendo}
        onCancelarResposta={() => setRespondendo(null)}
        currentContactId={conversa.contact_id}
        rascunho={rascunhoVivo}
        initialDraft={rascunhoVivo?.leitura.estado === "sugerido" ? rascunhoVivo.leitura.texto : ""}
      />
    </div>
  );
}
