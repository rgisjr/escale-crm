"use client";
import { useEffect, useMemo, useRef, useState } from "react";

import { PassagemCard } from "@/components/inbox/PassagemCard";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useConversaDaCasca } from "@/hooks/escale/useConversaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useAlterarMensagem } from "@/hooks/inbox/useAlterarMensagem";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useClaimConversation } from "@/hooks/inbox/useClaimConversation";
import { useConversationNotes } from "@/hooks/inbox/useConversationNotes";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useMessagesRealtime } from "@/hooks/inbox/useMessagesRealtime";
import { usePassagensDaConversa } from "@/hooks/inbox/usePassagensDaConversa";
import { useSendMessage } from "@/hooks/inbox/useSendMessage";
import { montarCartoesDaPassagem } from "@/lib/escalacao/cartao-da-passagem";
import { juntarItens, rotuloDoDia, type ItemDaThread } from "@/lib/escale/conversas/eventos";
import type { Message } from "@/lib/types/messaging";
import { cn } from "@/lib/utils";

import { BalaoDaCasca } from "./BalaoDaCasca";
import { EventoDaThread } from "./EventoDaThread";
import { NotaDaThread } from "./NotaDaThread";
import { SeparadorDeDia } from "./SeparadorDeDia";

interface PaginaDeMensagens {
  data: Message[];
  meta?: { has_more: boolean; cursor: string | null };
}

/** A última mensagem (por `sent_at`) das páginas carregadas — `ConversaAberta` usa para `ultimaFoiTemplate`. */
export function ultimaMensagem(pages: readonly PaginaDeMensagens[] | undefined): Message | null {
  const todas = pages?.flatMap((p) => p.data) ?? [];
  if (todas.length === 0) return null;
  return todas.reduce((a, b) => (Date.parse(b.sent_at) >= Date.parse(a.sent_at) ? b : a));
}

const diaDe = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/**
 * A THREAD DA CLINT (c02, c56; C4; N14): as mensagens, as notas, os cartões
 * de passagem (os do original) e os eventos do fork, intercalados por hora,
 * com o separador de dia. Os hooks são os do original; a 3E entra com
 * `compacto` no painel flutuante e na ficha.
 */
export function ThreadDaCasca({
  conversationId,
  conversa,
  searchTerm = "",
  aoResponder,
  compacto = false,
}: {
  conversationId: string;
  conversa: ConversationWithContact;
  searchTerm?: string;
  aoResponder?: (m: Message) => void;
  compacto?: boolean;
}) {
  const t = useT();
  const { user } = useAuth();
  const q = useMessagesRealtime(conversationId);
  const notas = useConversationNotes(conversationId);
  const passagens = usePassagensDaConversa(conversationId);
  const { eventos } = useConversaDaCasca(conversationId);
  const { data: membros = [] } = useAssignableMembers(true);
  const alterar = useAlterarMensagem(conversationId);
  const enviar = useSendMessage();
  const reivindicar = useClaimConversation();
  const fimRef = useRef<HTMLDivElement | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const nomes = useMemo(
    () => new Map(membros.map((m) => [m.user_id, m.full_name?.trim() || t("Atendente")])),
    [membros, t],
  );
  const mensagens = useMemo(() => q.data?.pages.flatMap((p) => p.data) ?? [], [q.data]);
  const cartoes = useMemo(
    () =>
      montarCartoesDaPassagem(passagens, {
        usuarioId: user?.id ?? "",
        donoId: conversa.assigned_to_user_id ?? null,
        donoNome: conversa.assigned_to_user_name ?? null,
      }),
    [passagens, user?.id, conversa.assigned_to_user_id, conversa.assigned_to_user_name],
  );
  const itens = useMemo(
    () => juntarItens(mensagens, notas, cartoes, eventos),
    [mensagens, notas, cartoes, eventos],
  );

  const ultimaId = mensagens.at(-1)?.id;
  useEffect(() => {
    fimRef.current?.scrollIntoView?.({ block: "end" });
  }, [conversationId, ultimaId]);

  const acoes = {
    aoResponder: (m: Message) => aoResponder?.(m),
    aoEditar: (m: Message, texto: string) =>
      void alterar.editar.mutateAsync({ id: m.id, text: texto }),
    aoApagarParaTodos: (m: Message) => void alterar.apagar.mutateAsync(m.id),
    aoApagarParaMim: (m: Message) => void alterar.ocultar.mutateAsync(m.id),
    aoRestaurar: (m: Message) => void alterar.restaurar.mutateAsync(m.id),
    aoReenviar: (m: Message) =>
      enviar.mutate({
        conversation_id: conversationId,
        type: m.type,
        ...(m.body ? { body: m.body } : {}),
        ...(m.media_storage_path
          ? { media_storage_path: m.media_storage_path, media_mime: m.media_mime ?? undefined }
          : {}),
      }),
  };

  const dataDeAgora = new Date(agora);
  return (
    <div
      className={cn(
        "h-full overflow-y-auto bg-casca-painel-chat",
        compacto ? "px-3 py-2" : "px-6 py-4",
      )}
      data-testid="thread-da-casca"
    >
      {q.hasNextPage ? (
        <div className="mb-2 text-center">
          <button
            type="button"
            className="text-[12px] font-medium text-casca-marca disabled:opacity-50"
            disabled={q.isFetchingNextPage}
            onClick={() => q.fetchNextPage()}
          >
            {q.isFetchingNextPage ? t("Carregando…") : t("Carregar mais antigas")}
          </button>
        </div>
      ) : null}
      {itens.map((item: ItemDaThread, i: number) => {
        const dia = diaDe(item.ts);
        const separador =
          i === 0 || dia !== diaDe(itens[i - 1]!.ts) ? (
            <SeparadorDeDia
              key={`dia-${dia}`}
              rotulo={rotuloDoDia(new Date(item.ts), dataDeAgora, t)}
            />
          ) : null;
        return (
          <div key={`${item.kind}-${item.data.id}`}>
            {separador}
            {item.kind === "message" ? (
              <BalaoDaCasca
                message={item.data}
                viewerUserId={user.id}
                nomes={nomes}
                searchTerm={searchTerm}
                agora={agora}
                {...acoes}
              />
            ) : item.kind === "note" ? (
              <NotaDaThread nota={item.data} />
            ) : item.kind === "evento" ? (
              <EventoDaThread evento={item.data} nomes={nomes} />
            ) : (
              <PassagemCard
                cartao={item.data}
                contatoId={conversa.contacts?.id ?? null}
                assumindo={reivindicar.isPending}
                onAssumir={() =>
                  reivindicar.mutate({
                    conversation_id: conversationId,
                    expected_assignee: conversa.assigned_to_user_id ?? null,
                  })
                }
              />
            )}
          </div>
        );
      })}
      {itens.length === 0 && !q.isLoading ? (
        <p className="py-8 text-center text-[12px] text-casca-suave">
          {t("Nenhuma mensagem ainda.")}
        </p>
      ) : null}
      <div ref={fimRef} />
    </div>
  );
}
