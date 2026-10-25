"use client";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useMensagensEmCache } from "@/hooks/inbox/useMessagesRealtime";
import { estadoDaJanela } from "@/lib/channels/janela";
import { modoDoCompositor } from "@/lib/escale/conversas/janela";
import { motivoDoContato } from "@/lib/inbox/motivo-do-envio-bloqueado";
import { ultimaMensagem } from "@/components/escale/conversas/centro/thread/ThreadDaCasca";

/** A regra do compositor da casca (3B C2, C11), para a ConversaAberta e a ConversaEmbutida (3E N10). */
export function useEstadoDoCompositor(conversa: ConversationWithContact) {
  const t = useT();
  const { user } = useAuth();
  const supportReadonly = user.support?.access_mode === "support_readonly";
  const mensagens = useMensagensEmCache(conversa.id);
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const provider = conversa.channel_sessions?.provider ?? null;
  const ultima = useMemo(() => ultimaMensagem(mensagens.data?.pages), [mensagens.data]);
  const ultimaFoiTemplate =
    !!ultima && ultima.direction === "outbound" && ultima.type === "template";
  const modo = modoDoCompositor({
    estado: estadoDaJanela(provider, conversa.last_inbound_at ?? null, agora),
    provider,
    ultimaFoiTemplate,
  });
  const bloqueio = supportReadonly
    ? t("Acompanhamento somente leitura")
    : motivoDoContato(conversa.contacts, t);
  return { modo, bloqueio, ultimaFoiTemplate, agora };
}
