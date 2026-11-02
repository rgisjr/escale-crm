import { registerAction } from "@/lib/automation/actions";
import { fontesDaAutomacao } from "@/lib/automation/fontes-da-automacao";
import { renderTemplate } from "@/lib/automation/template";
import type { ActionCtx, ActionResultDetail } from "@/lib/automation/types";
import { zernioCredsForAccountId } from "@/lib/channels/zernio/credentials";
import { socialMessageId } from "@/lib/channels/social/catalog";

import { comentarioDoEvento, dentroDaJanela, dentroDoPrazo } from "./caminhos";
import { GATILHO_DE_COMENTARIO, GATILHOS_DE_DIRECT, PASSO_DO_INSTAGRAM } from "./constantes";
import { confirmarDirect, falharDirect, gravarDirectNaConversa } from "./conversa";
import { directDoEventoSchema } from "./direct";
import { disparoDaRegra } from "./disparos";
import { decisaoDoPublico, payloadDoLiberar } from "./publico";
import { configDoComentarioSchema, configDoPassoDoInstagramSchema } from "./schema";
import {
  EXPLICACAO_DO_MOTIVO,
  enviarDirect,
  motivoDoErro,
  respostaPrivada,
  type BotaoDoDirect,
  type MotivoDoDirect,
} from "./zernio";

/**
 * FORK ESCALE · Fase 10B: o passo "Instagram" (`send_instagram_message`). Com o gatilho de comentário,
 * manda o direct como resposta privada ao comentário (uma por comentário, até 7 dias), pela API do
 * Zernio. A mensagem entra na conversa antes do envio (sent_via 'automation'), sem pausar a IA.
 */
const SO_COM_COMENTARIO = "O passo Instagram funciona com os gatilhos do Instagram.";
const TABELA = "escale_disparos_de_comentario";
/** Margem sob o CHECK de 8192 bytes de `direct_pendente` (9804). */
const TETO_DO_DIRECT_PENDENTE = 7500;

const falhou = (motivo: MotivoDoDirect, extra: Record<string, unknown> = {}): ActionResultDetail => ({
  type: PASSO_DO_INSTAGRAM,
  status: "failed",
  error: motivo,
  detail: { reason: motivo, explicacao: EXPLICACAO_DO_MOTIVO[motivo], ...extra },
});

/** FORK ESCALE · Fase 10D (D8): nos gatilhos de direct o passo manda mensagem comum pela conversa, com anexo. */
async function executarNoDirect(ctx: ActionCtx, config: ReturnType<typeof configDoPassoDoInstagramSchema.parse>): Promise<ActionResultDetail> {
  const evento = directDoEventoSchema.safeParse(ctx.event.payload);
  if (!evento.success) return { type: PASSO_DO_INSTAGRAM, status: "failed", error: "evento_ilegivel" };
  const direct = evento.data;
  if (!dentroDaJanela(direct.recebida_em, new Date())) return falhou("janela_fechada");

  const fontes = await fontesDaAutomacao(ctx, [config.texto]);
  const mensagem = renderTemplate(config.texto, ctx.context, undefined, fontes);
  const credencial = await zernioCredsForAccountId(ctx.admin, {
    organizationId: ctx.organizationId,
    accountId: direct.conta_id,
  });
  if (!credencial) return falhou("credencial_indisponivel");

  const botoes: BotaoDoDirect[] = config.botoes.map((b) => ({ tipo: "url", titulo: b.titulo, url: b.url }));
  const linhaId = await gravarDirectNaConversa(ctx.admin, {
    organizationId: ctx.organizationId,
    channelSessionId: direct.channel_session_id,
    contactId: direct.contact_id,
    plataforma: direct.plataforma,
    texto: mensagem,
    botoes,
    origem: "direct",
    anexo: config.anexo,
  });
  const enviada = await enviarDirect(credencial.apiKey, {
    conversaZernioId: direct.conversa_zernio_id,
    accountId: direct.conta_id,
    texto: mensagem,
    botoes,
    anexo: config.anexo,
  });
  if (!enviada.ok) {
    const motivo = motivoDoErro(enviada.status, enviada.corpo);
    if (linhaId) await falharDirect(ctx.admin, ctx.organizationId, linhaId, EXPLICACAO_DO_MOTIVO[motivo]);
    return falhou(motivo, { erro: `HTTP ${enviada.status}` });
  }
  const { messageId, anexoFalhou } = enviada.dados;
  if (linhaId) {
    await confirmarDirect(ctx.admin, ctx.organizationId, linhaId, messageId ? socialMessageId(direct.conta_id, messageId) : null);
  }
  return {
    type: PASSO_DO_INSTAGRAM,
    status: "success",
    detail: { message_id: messageId, ...(anexoFalhou ? { anexo_falhou: true } : {}) },
  };
}

async function executar(ctx: ActionCtx, config: Record<string, unknown>): Promise<ActionResultDetail> {
  const lida = configDoPassoDoInstagramSchema.safeParse(config);
  if (!lida.success) return { type: PASSO_DO_INSTAGRAM, status: "failed", error: "config_invalida" };
  if ((GATILHOS_DE_DIRECT as readonly string[]).includes(ctx.event.event_type)) return executarNoDirect(ctx, lida.data);
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
  if (disparo.direct === "enviado" || disparo.direct === "aguardando_seguir") {
    return { type: PASSO_DO_INSTAGRAM, status: "success" };
  }

  const registrar = (direct: string, motivo: string | null, extra: Record<string, unknown> = {}) =>
    ctx.admin
      .from(TABELA)
      .update({ direct, motivo, ...extra, updated_at: new Date().toISOString() })
      .eq("organization_id", ctx.organizationId)
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

  // D13: "Siga para liberar" — quem ainda não segue recebe o pedido com o botão postback, e o direct fica guardado.
  const { data: regraGravada } = await ctx.admin
    .from("automation_rules")
    .select("trigger_config")
    .eq("organization_id", ctx.organizationId)
    .eq("id", ctx.ruleId)
    .maybeSingle();
  const configDoGatilho = configDoComentarioSchema.safeParse((regraGravada as { trigger_config?: unknown } | null)?.trigger_config);
  const publico = configDoGatilho.success ? configDoGatilho.data.publico : null;
  const pedirParaSeguir =
    publico !== null && decisaoDoPublico(publico, evento.plataforma, comentario.autor.seguidor) === "pedir_para_seguir";
  const postId = comentario.publicacao_zernio_id ?? comentario.publicacao_id;
  const botoesDoDirect: BotaoDoDirect[] = botoes.map((b) => ({ tipo: "url", titulo: b.titulo, url: b.url }));
  const textoDoEnvio = pedirParaSeguir && publico ? publico.liberar.texto : mensagem;
  const botoesDoEnvio: BotaoDoDirect[] =
    pedirParaSeguir && publico
      ? [{ tipo: "postback", titulo: publico.liberar.titulo, payload: payloadDoLiberar(disparo.id) }]
      : botoesDoDirect;

  // O direct guardado tem teto no banco (8 KB). Estourar DEPOIS de mandar o pedido deixaria o link sem sair.
  const direct_pendente = { texto: mensagem, botoes: botoesDoDirect, post_id: postId, conta_id: evento.conta_id };
  if (pedirParaSeguir && Buffer.byteLength(JSON.stringify(direct_pendente), "utf8") > TETO_DO_DIRECT_PENDENTE) {
    await registrar("falhou", "mensagem_grande_demais");
    return falhou("mensagem_grande_demais");
  }

  const linhaId = await gravarDirectNaConversa(ctx.admin, {
    organizationId: ctx.organizationId,
    channelSessionId: evento.channel_session_id,
    contactId: evento.contact_id,
    plataforma: evento.plataforma,
    texto: textoDoEnvio,
    botoes: botoesDoEnvio,
    disparoId: disparo.id,
  });

  const enviada = await respostaPrivada(credencial.apiKey, {
    postId,
    commentId: comentario.id,
    accountId: evento.conta_id,
    texto: textoDoEnvio,
    botoes: botoesDoEnvio,
  });

  if (!enviada.ok) {
    const motivo = motivoDoErro(enviada.status, enviada.corpo);
    await registrar("falhou", motivo);
    if (linhaId) await falharDirect(ctx.admin, ctx.organizationId, linhaId, EXPLICACAO_DO_MOTIVO[motivo]);
    return falhou(motivo, { erro: `HTTP ${enviada.status}` });
  }

  const messageId = enviada.dados.messageId;
  if (pedirParaSeguir) {
    await registrar("aguardando_seguir", null, {
      direct_pendente,
      ...(messageId ? { direct_message_id: messageId } : {}),
    });
  } else {
    await registrar("enviado", null, messageId ? { direct_message_id: messageId } : {});
  }
  if (linhaId) {
    await confirmarDirect(
      ctx.admin,
      ctx.organizationId,
      linhaId,
      messageId ? socialMessageId(evento.conta_id, messageId) : null,
    );
  }
  if (pedirParaSeguir) {
    return {
      type: PASSO_DO_INSTAGRAM,
      status: "success",
      detail: {
        reason: "aguardando_seguir",
        explicacao:
          "A pessoa ainda não segue a conta. Ela recebeu o pedido para seguir e o link sai quando tocar em Já estou seguindo.",
        message_id: messageId,
      },
    };
  }
  return { type: PASSO_DO_INSTAGRAM, status: "success", detail: { message_id: messageId } };
}

registerAction({ type: PASSO_DO_INSTAGRAM, execute: executar });
