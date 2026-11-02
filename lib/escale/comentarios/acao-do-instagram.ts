import { registerAction } from "@/lib/automation/actions";
import { fontesDaAutomacao } from "@/lib/automation/fontes-da-automacao";
import { renderTemplate } from "@/lib/automation/template";
import type { ActionCtx, ActionResultDetail } from "@/lib/automation/types";
import { zernioCredsForAccountId } from "@/lib/channels/zernio/credentials";
import { socialMessageId } from "@/lib/channels/social/catalog";

import { comentarioDoEvento, dentroDoPrazo } from "./caminhos";
import { GATILHO_DE_COMENTARIO, PASSO_DO_INSTAGRAM } from "./constantes";
import { confirmarDirect, falharDirect, gravarDirectNaConversa } from "./conversa";
import { disparoDaRegra } from "./disparos";
import { configDoPassoDoInstagramSchema } from "./schema";
import { EXPLICACAO_DO_MOTIVO, motivoDoErro, respostaPrivada, type MotivoDoDirect } from "./zernio";

/**
 * FORK ESCALE · Fase 10B: o passo "Instagram" (`send_instagram_message`). Com o gatilho de comentário,
 * manda o direct como resposta privada ao comentário (uma por comentário, até 7 dias), pela API do
 * Zernio. A mensagem entra na conversa antes do envio (sent_via 'automation'), sem pausar a IA.
 */
const SO_COM_COMENTARIO = "O passo Instagram funciona com o gatilho “Alguém comenta em um post”.";
const TABELA = "escale_disparos_de_comentario";

const falhou = (motivo: MotivoDoDirect, extra: Record<string, unknown> = {}): ActionResultDetail => ({
  type: PASSO_DO_INSTAGRAM,
  status: "failed",
  error: motivo,
  detail: { reason: motivo, explicacao: EXPLICACAO_DO_MOTIVO[motivo], ...extra },
});

async function executar(ctx: ActionCtx, config: Record<string, unknown>): Promise<ActionResultDetail> {
  const lida = configDoPassoDoInstagramSchema.safeParse(config);
  if (!lida.success) return { type: PASSO_DO_INSTAGRAM, status: "failed", error: "config_invalida" };
  if (ctx.event.event_type !== GATILHO_DE_COMENTARIO) {
    return {
      type: PASSO_DO_INSTAGRAM,
      status: "skipped",
      detail: { reason: "so_com_gatilho_de_comentario", explicacao: SO_COM_COMENTARIO },
    };
  }
  const evento = comentarioDoEvento(ctx.event.payload);
  if (!evento) return { type: PASSO_DO_INSTAGRAM, status: "failed", error: "evento_ilegivel" };

  const { comentario } = evento;
  const disparo = await disparoDaRegra(ctx.admin, ctx.organizationId, ctx.ruleId, comentario.id);
  if (!disparo) return { type: PASSO_DO_INSTAGRAM, status: "skipped", detail: { reason: "sem_disparo" } };
  if (disparo.direct === "enviado") return { type: PASSO_DO_INSTAGRAM, status: "success" };

  const registrar = (direct: string, motivo: string | null, extra: Record<string, unknown> = {}) =>
    ctx.admin
      .from(TABELA)
      .update({ direct, motivo, ...extra, updated_at: new Date().toISOString() })
      .eq("id", disparo.id);

  if (!dentroDoPrazo(comentario.comentado_em, new Date())) {
    await registrar("falhou", "prazo_vencido");
    return falhou("prazo_vencido");
  }

  const { texto, botoes } = lida.data;
  const fontes = await fontesDaAutomacao(ctx, [texto]);
  const mensagem = renderTemplate(texto, ctx.context, undefined, fontes);

  const credencial = await zernioCredsForAccountId(ctx.admin, {
    organizationId: ctx.organizationId,
    accountId: evento.conta_id,
  });
  if (!credencial) {
    await registrar("falhou", "credencial_indisponivel");
    return falhou("credencial_indisponivel");
  }

  const linhaId = await gravarDirectNaConversa(ctx.admin, {
    organizationId: ctx.organizationId,
    channelSessionId: evento.channel_session_id,
    contactId: evento.contact_id,
    plataforma: evento.plataforma,
    texto: mensagem,
    botoes,
    disparoId: disparo.id,
  });

  const enviada = await respostaPrivada(credencial.apiKey, {
    postId: comentario.publicacao_zernio_id ?? comentario.publicacao_id,
    commentId: comentario.id,
    accountId: evento.conta_id,
    texto: mensagem,
    botoes,
  });

  if (!enviada.ok) {
    const motivo = motivoDoErro(enviada.status, enviada.corpo);
    await registrar("falhou", motivo);
    if (linhaId) await falharDirect(ctx.admin, ctx.organizationId, linhaId, EXPLICACAO_DO_MOTIVO[motivo]);
    return falhou(motivo, { erro: `HTTP ${enviada.status}` });
  }

  const messageId = enviada.dados.messageId;
  await registrar("enviado", null, messageId ? { direct_message_id: messageId } : {});
  if (linhaId) {
    await confirmarDirect(
      ctx.admin,
      ctx.organizationId,
      linhaId,
      messageId ? socialMessageId(evento.conta_id, messageId) : null,
    );
  }
  return { type: PASSO_DO_INSTAGRAM, status: "success", detail: { message_id: messageId } };
}

registerAction({ type: PASSO_DO_INSTAGRAM, execute: executar });
