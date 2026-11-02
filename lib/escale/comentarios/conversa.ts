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

interface SaidaNaConversa {
  organizationId: string;
  channelSessionId: string;
  contactId: string;
  plataforma: string;
  texto: string;
}

/** O miolo comum: conversa, canal, mensagem `sending` e preview. Devolve os ids, ou null (só loga). */
async function gravarSaidaNaConversa(
  admin: SupabaseClient,
  e: SaidaNaConversa,
  campos: { sent_via: "automation" | "user"; sent_by_user_id?: string; metadata: Record<string, unknown> },
): Promise<{ mensagemId: string; conversationId: string } | null> {
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
        status: "sending",
        type: "text",
        body: e.texto,
        sent_at: agora,
        ...campos,
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
    return { mensagemId: (linha as { id: string }).id, conversationId };
  } catch (erro) {
    logger.error("[comentarios.conversa] gravar direct falhou", {
      erro: erro instanceof Error ? erro.message : String(erro),
    });
    return null;
  }
}

/** Grava a mensagem `sending` da automação na conversa do contato. Devolve o id da linha, ou null (só loga). */
export async function gravarDirectNaConversa(
  admin: SupabaseClient,
  e: SaidaNaConversa & { botoes: readonly BotaoDaResposta[]; disparoId: string },
): Promise<string | null> {
  const gravada = await gravarSaidaNaConversa(admin, e, {
    sent_via: "automation",
    metadata: { origem: "comentario", disparo_id: e.disparoId, botoes: e.botoes },
  });
  return gravada?.mensagemId ?? null;
}

/**
 * FORK ESCALE · Fase 10A (D9): o direct mandado à mão pela caixa de comentários, como envio de
 * pessoa. O eco `message.sent` casa com esta linha (`eco.ts` aceita a origem `comentario_manual`).
 */
export function gravarDirectManualNaConversa(
  admin: SupabaseClient,
  e: SaidaNaConversa & { userId: string; comentarioId: string; acaoId: string },
): Promise<{ mensagemId: string; conversationId: string } | null> {
  return gravarSaidaNaConversa(admin, e, {
    sent_via: "user",
    sent_by_user_id: e.userId,
    metadata: { origem: "comentario_manual", comentario_id: e.comentarioId, acao_id: e.acaoId },
  });
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
