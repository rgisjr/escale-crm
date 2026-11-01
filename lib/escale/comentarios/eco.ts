import type { SupabaseClient } from "@supabase/supabase-js";

import type { SocialMessage } from "@/lib/channels/social/parser";
import { logger } from "@/lib/logger";

import { JANELA_DO_ECO_MS } from "./constantes";

/**
 * FORK ESCALE · Fase 10B (D13): o eco `message.sent` do Zernio para o direct que a automação mandou.
 * Ele NÃO vira outra linha e NÃO pausa a IA: é a mesma mensagem que `conversa.ts` gravou antes do
 * envio. Casa pelo id do Zernio ou, na falta, pelo texto nos últimos 15 minutos.
 */
const VIOLACAO_DE_UNICIDADE = "23505";

interface LinhaDaAutomacao {
  id: string;
  conversation_id: string;
  external_id: string | null;
  body: string | null;
  metadata: Record<string, unknown> | null;
}

/** true quando o eco é desta automação (nada mais deve ser feito com ele). */
export async function ecoDaMensagemDaAutomacao(
  admin: SupabaseClient,
  e: { organizationId: string; channelSessionId: string; msg: SocialMessage },
): Promise<boolean> {
  const { msg } = e;
  if (msg.direction !== "outbound" || msg.kind !== "message") return false;
  try {
    const identidade = `${msg.platform}:${msg.accountId}:${msg.participantId}`;
    const { data: contato } = await admin
      .from("contacts")
      .select("id")
      .eq("organization_id", e.organizationId)
      .eq("social_identity", identidade)
      .is("is_merged_into", null)
      .maybeSingle();
    if (!contato) return false;

    const desde = new Date(Date.now() - JANELA_DO_ECO_MS).toISOString();
    const { data } = await admin
      .from("messages")
      .select("id, conversation_id, external_id, body, metadata")
      .eq("organization_id", e.organizationId)
      .eq("channel_session_id", e.channelSessionId)
      .eq("contact_id", (contato as { id: string }).id)
      .eq("sent_via", "automation")
      .eq("direction", "outbound")
      .eq("metadata->>origem", "comentario")
      .gte("created_at", desde)
      .order("created_at", { ascending: false })
      .limit(20);
    const candidatas = (data ?? []) as LinhaDaAutomacao[];
    const alvo =
      candidatas.find((m) => m.external_id !== null && m.external_id === msg.externalId) ??
      candidatas.find((m) => m.metadata?.eco !== true && msg.text !== null && m.body === msg.text);
    if (!alvo) return false;

    const { error } = await admin
      .from("messages")
      .update({
        ...(alvo.external_id === msg.externalId ? {} : { external_id: msg.externalId }),
        metadata: { ...(alvo.metadata ?? {}), eco: true },
      })
      .eq("organization_id", e.organizationId)
      .eq("id", alvo.id);
    if (error && error.code !== VIOLACAO_DE_UNICIDADE) throw new Error(error.message);

    await admin
      .from("conversations")
      .update({ provider_conversation_id: msg.conversationId })
      .eq("organization_id", e.organizationId)
      .eq("id", alvo.conversation_id);
    return true;
  } catch (erro) {
    logger.error("[comentarios.eco] reconhecer eco falhou", {
      erro: erro instanceof Error ? erro.message : String(erro),
    });
    return false;
  }
}
