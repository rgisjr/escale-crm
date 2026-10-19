"use client";
import { useState } from "react";

import { useEstadoDoCompositor } from "@/hooks/escale/useEstadoDoCompositor";
import { useModoEspiao } from "@/hooks/escale/useModoEspiao";
import { useT } from "@/hooks/i18n/useT";
import { useConversation } from "@/hooks/inbox/useConversation";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useMarkAsRead } from "@/hooks/inbox/useMarkAsRead";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Message } from "@/lib/types/messaging";
import { Loader2 } from "@/lib/ui/icons-da-casca";

import { JanelaAgendarMensagem } from "./agendadas/JanelaAgendarMensagem";
import { CompositorDaCasca } from "./centro/compositor/CompositorDaCasca";
import { ThreadDaCasca } from "./centro/thread/ThreadDaCasca";

function Conteudo({
  conversa,
  compacta,
}: {
  conversa: ConversationWithContact;
  compacta: boolean;
}) {
  const [espiao] = useModoEspiao();
  useMarkAsRead(espiao ? null : conversa.id, conversa.unread_count_for_assignee ?? 0);
  const { modo, bloqueio } = useEstadoDoCompositor(conversa);
  const [respondendo, setRespondendo] = useState<Message | null>(null);
  const [agendando, setAgendando] = useState<{ texto: string } | null>(null);
  return (
    // O provedor das dicas mora aqui: fora da tela de Conversas (painel flutuante,
    // ficha do negócio) não há TooltipProvider acima, e o compositor usa dica (escale.15).
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-hidden">
          <ThreadDaCasca
            conversationId={conversa.id}
            conversa={conversa}
            aoResponder={setRespondendo}
            compacto={compacta}
          />
        </div>
        <CompositorDaCasca
          key={`compositor:${conversa.id}`}
          conversationId={conversa.id}
          conversa={conversa}
          modo={modo}
          bloqueio={bloqueio}
          respondendo={respondendo}
          aoCancelarResposta={() => setRespondendo(null)}
          aoAgendar={(texto) => setAgendando({ texto })}
          compacto={compacta}
        />
        <JanelaAgendarMensagem
          aberta={agendando !== null}
          aoFechar={() => setAgendando(null)}
          conversa={conversa}
          textoInicial={agendando?.texto ?? ""}
          modo={modo}
        />
      </div>
    </TooltipProvider>
  );
}

/**
 * A CONVERSA EMBUTIDA (fork Escale, Fase 3E; F3, F4; N10): a thread e o compositor
 * da 3B fora da tela de Conversas (painel flutuante, aba Conversas da ficha).
 * Marca como lida só fora do modo espião (a marca da sessão, 3A N7).
 */
export function ConversaEmbutida({
  conversationId,
  compacta = false,
}: {
  conversationId: string;
  compacta?: boolean;
}) {
  const t = useT();
  const { data, isPending } = useConversation(conversationId, true);
  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center text-casca-suave">
        <Loader2 size={18} aria-hidden className="animate-spin text-casca-marca" />
      </div>
    );
  }
  if (!data)
    return (
      <p className="p-6 text-center text-[12px] text-casca-suave">
        {t("Não foi possível carregar a conversa.")}
      </p>
    );
  return <Conteudo conversa={data} compacta={compacta} />;
}
