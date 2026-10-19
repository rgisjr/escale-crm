"use client";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import type { SecoesVisiveis } from "@/lib/escale/conversas/secoes";

export function SecoesDoPainel(_props: {
  conversa: ConversationWithContact;
  quadro: QuadroDoNegocio | null;
  secoes: SecoesVisiveis;
  aoMudarSecoes: (s: Partial<SecoesVisiveis>) => void;
  aoAbrirConversa: (id: string | null) => void;
}) {
  return null;
}
