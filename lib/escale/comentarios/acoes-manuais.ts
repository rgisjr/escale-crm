import type { SupabaseClient } from "@supabase/supabase-js";

import { audit } from "@/lib/audit";
import type { AuditAction } from "@/lib/audit/actions";
import { socialMessageId } from "@/lib/channels/social/catalog";
import { upsertSocialContact } from "@/lib/channels/zernio/ingest";
import { logger } from "@/lib/logger";

import { dentroDoPrazo } from "./caminhos";
import { ACAO_INTERROMPIDA_MS, type AcaoNoComentario } from "./constantes";
import { confirmarDirect, falharDirect, gravarDirectManualNaConversa } from "./conversa";
import type { ContextoDaAcao } from "./rota-da-acao";
import {
  EXPLICACAO_DO_MOTIVO,
  apagarComentario,
  curtirComentario,
  descurtirComentario,
  motivoDoErro,
  ocultarComentario,
  reexibirComentario,
  respostaPrivada,
  responderComentario,
  type RespostaDoZernio,
} from "./zernio";

/**
 * FORK ESCALE · Fase 10A: as ações feitas à mão na caixa (resposta, direct, ocultar, apagar). Cada uma
 * reserva uma linha em `escale_acoes_no_comentario` (`enviando`), fala com o Zernio e conclui a linha.
 * O índice único parcial da 9803 segura "um direct por comentário".
 */
const VIOLACAO_DE_UNICIDADE = "23505";
const TABELA = "escale_acoes_no_comentario";

export type ResultadoDaAcao =
  | { ok: true; dados: Record<string, unknown> }
  | { ok: false; status: number; corpo: unknown }
  | { ok: false; jaUsado: true };

/**
 * Insere a ação `enviando`. Antes, o direct `enviando` do mesmo comentário com mais de 2 min vira
 * `falhou`/`interrompido` (D13). 23505 → `ja_usado`.
 */
export async function reservarAcao(
  admin: SupabaseClient,
  e: { ctx: ContextoDaAcao; acao: AcaoNoComentario; autorId: string | null; texto: string | null },
): Promise<{ ok: true; id: string } | { ok: false; motivo: "ja_usado" }> {
  const { ctx } = e;
  if (e.acao === "direct") {
    const limite = new Date(Date.now() - ACAO_INTERROMPIDA_MS).toISOString();
    const { error } = await admin
      .from(TABELA)
      .update({ status: "falhou", motivo: "interrompido", updated_at: new Date().toISOString() })
      .eq("organization_id", ctx.organizationId)
      .eq("comentario_id", ctx.comentarioId)
      .eq("acao", "direct")
      .eq("status", "enviando")
      .lt("created_at", limite);
    if (error) throw new Error(error.message);
  }
  const { data, error } = await admin
    .from(TABELA)
    .insert({
      organization_id: ctx.organizationId,
      channel_session_id: ctx.conta.id,
      plataforma: ctx.conta.plataforma,
      comentario_id: ctx.comentarioId,
      publicacao_id: ctx.publicacaoId,
      autor_id: e.autorId,
      acao: e.acao,
      status: "enviando",
      texto: e.texto,
      user_id: ctx.userId,
    })
    .select("id")
    .single();
  if (error?.code === VIOLACAO_DE_UNICIDADE) return { ok: false, motivo: "ja_usado" };
  if (error || !data) throw new Error(error?.message ?? "acao_nao_reservada");
  return { ok: true, id: (data as { id: string }).id };
}

/** Fecha a linha da ação. Nunca lança (só loga): o efeito no Zernio já aconteceu. */
export async function concluirAcao(
  admin: SupabaseClient,
  e: {
    organizationId: string;
    id: string;
    status: "feito" | "falhou";
    motivo?: string | null;
    resultadoId?: string | null;
    contactId?: string | null;
    messageId?: string | null;
  },
): Promise<void> {
  try {
    const { error } = await admin
      .from(TABELA)
      .update({
        status: e.status,
        motivo: e.motivo ?? null,
        ...(e.resultadoId ? { resultado_id: e.resultadoId } : {}),
        ...(e.contactId ? { contact_id: e.contactId } : {}),
        ...(e.messageId ? { message_id: e.messageId } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", e.organizationId)
      .eq("id", e.id);
    if (error) throw new Error(error.message);
  } catch (erro) {
    logger.error("[comentarios.acoes] concluir ação falhou", {
      erro: erro instanceof Error ? erro.message : String(erro),
    });
  }
}

const registrar = (ctx: ContextoDaAcao, action: AuditAction): void => {
  void audit({
    action,
    actorUserId: ctx.userId,
    organizationId: ctx.organizationId,
    resourceType: "channel_session",
    resourceId: null,
    requestId: ctx.requestId,
    metadata: { comentario_id: ctx.comentarioId, publicacao_id: ctx.publicacaoId },
  });
};

/** Reserva, fala com o Zernio, conclui. O molde das ações sem efeito na conversa. */
async function agirNoZernio(
  ctx: ContextoDaAcao,
  e: {
    acao: AcaoNoComentario;
    autorId: string | null;
    texto: string | null;
    auditoria: AuditAction;
    /** Recebe o id da ação reservada (a `Idempotency-Key` da resposta pública, D11). */
    enviar: (acaoId: string) => Promise<RespostaDoZernio<unknown>>;
    dadosDoSucesso: (resposta: unknown) => Record<string, unknown>;
    resultadoId?: (resposta: unknown) => string | null;
  },
): Promise<ResultadoDaAcao> {
  const reserva = await reservarAcao(ctx.admin, { ctx, acao: e.acao, autorId: e.autorId, texto: e.texto });
  if (!reserva.ok) return { ok: false, jaUsado: true };
  const r = await e.enviar(reserva.id);
  if (!r.ok) {
    await concluirAcao(ctx.admin, { organizationId: ctx.organizationId, id: reserva.id, status: "falhou", motivo: motivoDoErro(r.status, r.corpo) });
    return { ok: false, status: r.status, corpo: r.corpo };
  }
  await concluirAcao(ctx.admin, {
    organizationId: ctx.organizationId,
    id: reserva.id,
    status: "feito",
    resultadoId: e.resultadoId?.(r.dados) ?? null,
  });
  registrar(ctx, e.auditoria);
  return { ok: true, dados: e.dadosDoSucesso(r.dados) };
}

export function responderAMao(ctx: ContextoDaAcao, texto: string): Promise<ResultadoDaAcao> {
  const idDaResposta = (resposta: unknown): string | null =>
    (resposta as { commentId: string | null }).commentId;
  return agirNoZernio(ctx, {
    acao: "resposta",
    autorId: null,
    texto,
    auditoria: "comment.replied",
    enviar: (acaoId) =>
      responderComentario(ctx.chave, {
        postId: ctx.publicacaoId,
        commentId: ctx.comentarioId,
        accountId: ctx.conta.contaId,
        texto,
        idempotencia: acaoId,
      }),
    dadosDoSucesso: (resposta) => ({ commentId: idDaResposta(resposta) }),
    resultadoId: idDaResposta,
  });
}

export async function mandarDirectAMao(
  ctx: ContextoDaAcao,
  e: { texto: string; autor: { id: string; usuario: string | null; nome: string | null }; comentadoEm: string },
): Promise<ResultadoDaAcao> {
  // A data vem da tela; o Zernio recusa de qualquer jeito se ela mentir.
  if (!dentroDoPrazo(e.comentadoEm, new Date())) {
    return { ok: false, status: 409, corpo: { motivo: "prazo_vencido" } };
  }
  const { data: disparo, error: erroDoDisparo } = await ctx.admin
    .from("escale_disparos_de_comentario")
    .select("id")
    .eq("organization_id", ctx.organizationId)
    .eq("comentario_id", ctx.comentarioId)
    .eq("direct", "enviado")
    .limit(1);
  if (erroDoDisparo) throw new Error(erroDoDisparo.message);
  if ((disparo ?? []).length > 0) return { ok: false, jaUsado: true };

  const reserva = await reservarAcao(ctx.admin, { ctx, acao: "direct", autorId: e.autor.id, texto: e.texto });
  if (!reserva.ok) return { ok: false, jaUsado: true };

  let contactId: string | null = null;
  try {
    contactId = await upsertSocialContact(
      ctx.admin,
      ctx.organizationId,
      `${ctx.conta.plataforma}:${ctx.conta.contaId}:${e.autor.id}`,
      e.autor.nome ?? e.autor.usuario,
    );
  } catch (erro) {
    // O direct sai assim mesmo; a ação fica sem contact_id.
    logger.error("[comentarios.acoes] contato do direct não resolvido", {
      erro: erro instanceof Error ? erro.message : String(erro),
    });
  }

  const gravada = contactId
    ? await gravarDirectManualNaConversa(ctx.admin, {
        organizationId: ctx.organizationId,
        channelSessionId: ctx.conta.id,
        contactId,
        plataforma: ctx.conta.plataforma,
        texto: e.texto,
        userId: ctx.userId,
        comentarioId: ctx.comentarioId,
        acaoId: reserva.id,
      })
    : null;

  const enviada = await respostaPrivada(ctx.chave, {
    postId: ctx.publicacaoId,
    commentId: ctx.comentarioId,
    accountId: ctx.conta.contaId,
    texto: e.texto,
    botoes: [],
  });

  if (!enviada.ok) {
    const motivo = motivoDoErro(enviada.status, enviada.corpo);
    await concluirAcao(ctx.admin, { organizationId: ctx.organizationId, id: reserva.id, status: "falhou", motivo, contactId, messageId: gravada?.mensagemId });
    if (gravada) await falharDirect(ctx.admin, ctx.organizationId, gravada.mensagemId, EXPLICACAO_DO_MOTIVO[motivo]);
    return { ok: false, status: enviada.status, corpo: enviada.corpo };
  }

  const idDoZernio = enviada.dados.messageId;
  await concluirAcao(ctx.admin, {
    organizationId: ctx.organizationId,
    id: reserva.id,
    status: "feito",
    resultadoId: idDoZernio,
    contactId,
    messageId: gravada?.mensagemId,
  });
  if (gravada) {
    await confirmarDirect(
      ctx.admin,
      ctx.organizationId,
      gravada.mensagemId,
      idDoZernio ? socialMessageId(ctx.conta.contaId, idDoZernio) : null,
    );
  }
  registrar(ctx, "comment.private_replied");
  return { ok: true, dados: { conversationId: gravada?.conversationId ?? null } };
}

export function ocultarAMao(ctx: ContextoDaAcao, ocultar: boolean, autorId: string | null): Promise<ResultadoDaAcao> {
  const alvo = { postId: ctx.publicacaoId, commentId: ctx.comentarioId, accountId: ctx.conta.contaId };
  return agirNoZernio(ctx, {
    acao: ocultar ? "ocultar" : "reexibir",
    autorId,
    texto: null,
    auditoria: ocultar ? "comment.hidden" : "comment.unhidden",
    enviar: () => (ocultar ? ocultarComentario(ctx.chave, alvo) : reexibirComentario(ctx.chave, alvo)),
    dadosDoSucesso: () => ({ oculto: ocultar }),
  });
}

/** FORK ESCALE · Fase 10D (D15): curtir (POST) ou descurtir (DELETE) à mão. A rota recusa conta do Instagram antes. */
export function curtirAMao(ctx: ContextoDaAcao, curtir: boolean, autorId: string | null): Promise<ResultadoDaAcao> {
  const alvo = { postId: ctx.publicacaoId, commentId: ctx.comentarioId, accountId: ctx.conta.contaId };
  return agirNoZernio(ctx, {
    acao: curtir ? "curtir" : "descurtir",
    autorId,
    texto: null,
    auditoria: curtir ? "comment.liked" : "comment.unliked",
    enviar: () => (curtir ? curtirComentario(ctx.chave, alvo) : descurtirComentario(ctx.chave, alvo)),
    dadosDoSucesso: () => ({ curtido: curtir }),
  });
}

export function apagarAMao(ctx: ContextoDaAcao, autorId: string | null): Promise<ResultadoDaAcao> {
  return agirNoZernio(ctx, {
    acao: "apagar",
    autorId,
    texto: null,
    auditoria: "comment.deleted",
    enviar: () => apagarComentario(ctx.chave, { postId: ctx.publicacaoId, commentId: ctx.comentarioId, accountId: ctx.conta.contaId }),
    dadosDoSucesso: () => ({ apagado: true }),
  });
}
