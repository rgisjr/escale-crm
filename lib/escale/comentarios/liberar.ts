import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { zernioCredsForAccountId } from "@/lib/channels/zernio/credentials";
import { socialMessageId } from "@/lib/channels/social/catalog";
import { logger } from "@/lib/logger";

import { sortearVariacao } from "./caminhos";
import { MAXIMO_DE_TOQUES_NO_LIBERAR } from "./constantes";
import { confirmarDirect, falharDirect, gravarDirectNaConversa } from "./conversa";
import { acoesNoComentario } from "./disparos";
import { payloadDoLiberar } from "./publico";
import { anexoSchema, configDoComentarioSchema } from "./schema";
import { EXPLICACAO_DO_MOTIVO, enviarDirect, motivoDoErro, responderComentario, type BotaoDoDirect } from "./zernio";

/**
 * FORK ESCALE · Fase 10D (D13): o toque no "Já estou seguindo". O passo Instagram guarda o direct pronto
 * em `direct_pendente` e manda a mensagem de liberar; quando a pessoa toca e o Instagram diz que ela
 * segue, este arquivo manda o direct guardado e faz o que estava esperando (resposta pública, ocultar).
 */
const TABELA = "escale_disparos_de_comentario";

const botaoSchema = z.union([
  z.object({ tipo: z.literal("url"), titulo: z.string(), url: z.string() }),
  z.object({ tipo: z.literal("postback"), titulo: z.string(), payload: z.string() }),
]);
/** O que o passo guarda: o texto já renderizado, os botões, o anexo (nunca no comentário) e o post do Zernio. */
export const diretoPendenteSchema = z.object({
  texto: z.string().min(1),
  botoes: z.array(botaoSchema).default([]),
  anexo: anexoSchema.nullish(),
  post_id: z.string().min(1),
  conta_id: z.string().min(1),
});
export type DiretoPendente = z.infer<typeof diretoPendenteSchema>;

interface LinhaDoDisparo {
  id: string;
  rule_id: string;
  channel_session_id: string | null;
  contact_id: string | null;
  caminho_id: string;
  plataforma: string;
  comentario_id: string;
  publicacao_id: string;
  toques_no_liberar: number;
  direct_pendente: unknown;
  ocultar: string;
  curtir: string;
}

export type ResultadoDoLiberar = "enviado" | "pediu_de_novo" | "desistiu" | "ignorado";

/** O toque no "Já estou seguindo". Nunca lança. */
export async function liberarDirect(
  admin: SupabaseClient,
  e: { organizationId: string; disparoId: string; seguidor: boolean | null; conversaZernioId: string; contaId: string },
): Promise<ResultadoDoLiberar> {
  try {
    const { data } = await admin
      .from(TABELA)
      .select(
        "id, rule_id, channel_session_id, contact_id, caminho_id, plataforma, comentario_id, publicacao_id, toques_no_liberar, direct_pendente, ocultar, curtir",
      )
      .eq("organization_id", e.organizationId)
      .eq("id", e.disparoId)
      .eq("direct", "aguardando_seguir")
      .maybeSingle();
    const disparo = data as LinhaDoDisparo | null;
    if (!disparo || !disparo.channel_session_id || !disparo.contact_id) return "ignorado";

    const pendente = diretoPendenteSchema.safeParse(disparo.direct_pendente);
    const { data: regra } = await admin
      .from("automation_rules")
      .select("trigger_config")
      .eq("organization_id", e.organizationId)
      .eq("id", disparo.rule_id)
      .maybeSingle();
    const config = configDoComentarioSchema.safeParse((regra as { trigger_config?: unknown } | null)?.trigger_config);
    const credencial = await zernioCredsForAccountId(admin, { organizationId: e.organizationId, accountId: e.contaId });
    if (!pendente.success || !config.success || !config.data.publico || !credencial) {
      await atualizar(admin, disparo.id, { direct: "falhou", motivo: credencial ? "config_ilegivel" : "credencial_indisponivel", direct_pendente: null });
      return "desistiu";
    }

    const saida = {
      organizationId: e.organizationId,
      channelSessionId: disparo.channel_session_id,
      contactId: disparo.contact_id,
      plataforma: disparo.plataforma,
    };
    const base = { conversaZernioId: e.conversaZernioId, accountId: e.contaId };

    if (e.seguidor === true) {
      const botoes = pendente.data.botoes as BotaoDoDirect[];
      const linhaId = await gravarDirectNaConversa(admin, {
        ...saida,
        texto: pendente.data.texto,
        botoes,
        disparoId: disparo.id,
        origem: "direct",
        anexo: pendente.data.anexo ?? null,
      });
      const enviada = await enviarDirect(credencial.apiKey, { ...base, texto: pendente.data.texto, botoes, anexo: pendente.data.anexo });
      if (!enviada.ok) {
        const motivo = motivoDoErro(enviada.status, enviada.corpo);
        await atualizar(admin, disparo.id, { direct: "falhou", motivo });
        if (linhaId) await falharDirect(admin, e.organizationId, linhaId, EXPLICACAO_DO_MOTIVO[motivo]);
        return "desistiu";
      }
      const messageId = enviada.dados.messageId;
      if (linhaId) {
        await confirmarDirect(admin, e.organizationId, linhaId, messageId ? socialMessageId(e.contaId, messageId) : null);
      }
      const caminho = config.data.caminhos.find((c) => c.id === disparo.caminho_id);
      const texto = caminho?.resposta ? sortearVariacao(caminho.resposta.variacoes) : null;
      let resposta: Record<string, unknown> = { resposta: "sem_resposta" };
      if (texto) {
        const publica = await responderComentario(credencial.apiKey, {
          postId: pendente.data.post_id,
          commentId: disparo.comentario_id,
          accountId: e.contaId,
          texto,
          idempotencia: disparo.id,
        });
        resposta = publica.ok
          ? { resposta: "publicada", resposta_publicada: texto }
          : { resposta: "falhou", motivo: motivoDoErro(publica.status, publica.corpo) };
      }
      const acoes = await acoesNoComentario(credencial.apiKey, {
        disparo,
        plataforma: disparo.plataforma,
        postId: pendente.data.post_id,
        commentId: disparo.comentario_id,
        accountId: e.contaId,
      });
      await atualizar(admin, disparo.id, {
        direct: "enviado",
        direct_pendente: null,
        ...(messageId ? { direct_message_id: messageId } : {}),
        ...resposta,
        ...acoes,
      });
      return "enviado";
    }

    // Não segue (ou o Instagram não informou): pede de novo, até o limite.
    const toques = disparo.toques_no_liberar + 1;
    if (toques >= MAXIMO_DE_TOQUES_NO_LIBERAR) {
      await atualizar(admin, disparo.id, { direct: "falhou", motivo: "nao_seguiu", direct_pendente: null, toques_no_liberar: toques });
      return "desistiu";
    }
    const { liberar } = config.data.publico;
    const botao: BotaoDoDirect = { tipo: "postback", titulo: liberar.titulo, payload: payloadDoLiberar(disparo.id) };
    const linhaId = await gravarDirectNaConversa(admin, {
      ...saida,
      texto: liberar.texto_de_quem_nao_segue,
      botoes: [botao],
      disparoId: disparo.id,
      origem: "direct",
    });
    const reenvio = await enviarDirect(credencial.apiKey, { ...base, texto: liberar.texto_de_quem_nao_segue, botoes: [botao] });
    if (linhaId) {
      if (reenvio.ok) {
        const id = reenvio.dados.messageId;
        await confirmarDirect(admin, e.organizationId, linhaId, id ? socialMessageId(e.contaId, id) : null);
      } else {
        await falharDirect(admin, e.organizationId, linhaId, EXPLICACAO_DO_MOTIVO[motivoDoErro(reenvio.status, reenvio.corpo)]);
      }
    }
    await atualizar(admin, disparo.id, { toques_no_liberar: toques });
    return "pediu_de_novo";
  } catch (erro) {
    logger.error("[comentarios.liberar] liberar falhou", { erro: erro instanceof Error ? erro.message : String(erro) });
    return "ignorado";
  }
}

async function atualizar(admin: SupabaseClient, disparoId: string, campos: Record<string, unknown>): Promise<void> {
  const { error } = await admin
    .from(TABELA)
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq("id", disparoId);
  if (error) logger.error("[comentarios.liberar] atualizar disparo falhou", { erro: error.message });
}
