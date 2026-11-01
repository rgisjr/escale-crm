import type { SupabaseClient } from "@supabase/supabase-js";

import { ehCanalDeConversa } from "@/lib/channels/canais-de-conversa";
import { marcarConversaComMensagem } from "@/lib/channels/marcar-conversa";
import { logger } from "@/lib/logger";

import type { BotaoDaResposta } from "./zernio";

/**
 * FORK ESCALE · Fase 10B: o direct do passo Instagram na conversa. A linha é gravada ANTES do envio
 * (`sending`) e atualizada com o desfecho: o eco `message.sent` do Zernio pode chegar antes da
 * resposta da API, e `eco.ts` o reconhece como esta mesma mensagem.
 */
const VIOLACAO_DE_UNICIDADE = "23505";

/** Grava a mensagem `sending` da automação na conversa do contato. Devolve o id da linha, ou null (só loga). */
export async function gravarDirectNaConversa(
  admin: SupabaseClient,
  e: {
    organizationId: string;
    channelSessionId: string;
    contactId: string;
    plataforma: string;
    texto: string;
    botoes: readonly BotaoDaResposta[];
    disparoId: string;
  },
): Promise<string | null> {
  try {
    const { data: conversa, error: erroDaConversa } = await admin.rpc("fn_upsert_wa_conversation", {
      p_org: e.organizationId,
      p_contact: e.contactId,
      p_session: e.channelSessionId,
    });
    if (erroDaConversa || !conversa) throw new Error(erroDaConversa?.message ?? "conversa_nao_resolvida");
    const conversationId = conversa as string;

    if (ehCanalDeConversa(e.plataforma)) {
      await admin
        .from("conversations")
        .update({ channel: e.plataforma })
        .eq("organization_id", e.organizationId)
        .eq("id", conversationId);
    }

    const agora = new Date().toISOString();
    const { data: linha, error } = await admin
      .from("messages")
      .insert({
        organization_id: e.organizationId,
        conversation_id: conversationId,
        contact_id: e.contactId,
        channel_session_id: e.channelSessionId,
        external_id: null,
        direction: "outbound",
        sent_via: "automation",
        status: "sending",
        type: "text",
        body: e.texto,
        sent_at: agora,
        metadata: { origem: "comentario", disparo_id: e.disparoId, botoes: e.botoes },
      })
      .select("id")
      .single();
    if (error || !linha) throw new Error(error?.message ?? "mensagem_nao_gravada");

    await marcarConversaComMensagem(admin, {
      organizationId: e.organizationId,
      conversationId,
      direction: "outbound",
      preview: e.texto,
      at: agora,
      canal: "zernio",
    });
    return (linha as { id: string }).id;
  } catch (erro) {
    logger.error("[comentarios.conversa] gravar direct falhou", {
      erro: erro instanceof Error ? erro.message : String(erro),
    });
    return null;
  }
}

/** O Zernio aceitou: `sent`, com o id dele. 23505 = o eco já gravou com o mesmo id (nada a fazer). */
export async function confirmarDirect(
  admin: SupabaseClient,
  organizationId: string,
  mensagemId: string,
  externalId: string | null,
): Promise<void> {
  const { error } = await admin
    .from("messages")
    .update({ status: "sent", sent_at: new Date().toISOString(), ...(externalId ? { external_id: externalId } : {}) })
    .eq("organization_id", organizationId)
    .eq("id", mensagemId);
  if (error && error.code !== VIOLACAO_DE_UNICIDADE) {
    logger.error("[comentarios.conversa] confirmar direct falhou", { erro: error.message });
  }
}

/** O Zernio recusou: `failed`, com a explicação legível. */
export async function falharDirect(
  admin: SupabaseClient,
  organizationId: string,
  mensagemId: string,
  motivo: string,
): Promise<void> {
  const { error } = await admin
    .from("messages")
    .update({ status: "failed", error_code: "zernio_error", error_message: motivo })
    .eq("organization_id", organizationId)
    .eq("id", mensagemId);
  if (error) logger.error("[comentarios.conversa] falhar direct falhou", { erro: error.message });
}
