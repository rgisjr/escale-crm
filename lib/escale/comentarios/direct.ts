import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { SocialMessage } from "@/lib/channels/social/parser";
import { logger } from "@/lib/logger";

import {
  CACHE_DAS_REGRAS_DE_DIRECT_MS,
  GATILHO_DE_MENCAO_EM_STORY,
  GATILHO_DE_MENSAGEM_DO_INSTAGRAM,
  GATILHO_DE_RESPOSTA_A_STORY,
  GATILHOS_DE_DIRECT,
  PLATAFORMAS_DE_COMENTARIO,
  SILENCIO_DA_AUTOMACAO_MS,
  type GatilhoDeDirect,
} from "./constantes";
import { casaComFiltro } from "./filtro";
import { liberarDirect } from "./liberar";
import { disparoDoLiberar } from "./publico";
import { configDoDirectSchema } from "./schema";

/**
 * FORK ESCALE · Fase 10D: o direct do Instagram que entra. A ingestão chama `aoReceberDirect` DEPOIS
 * de gravar a mensagem e ANTES do despacho do agente: se alguma regra ativa quer aquela mensagem, a IA
 * fica quieta na conversa (D6, sem resposta dupla) e o evento do gatilho é emitido (D1).
 */
export interface ExtrasDoDirect {
  mencaoEmStory: boolean;
  respostaAStory: { storyId: string; storyUrl: string | null } | null;
  botao: string | null;
  seguidor: boolean | null;
}
export const SEM_EXTRAS: ExtrasDoDirect = { mencaoEmStory: false, respostaAStory: null, botao: null, seguidor: null };

const objeto = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const texto = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);

/** Lê do payload cru do `message.received` do Zernio (no topo ou dentro de `message`). Nunca lança. */
export function extrasDoDirect(payload: unknown): ExtrasDoDirect {
  try {
    const raiz = objeto(payload);
    const mensagem = objeto(raiz.message);
    const metadata = { ...objeto(raiz.metadata), ...objeto(mensagem.metadata) };
    const storyReply = objeto(metadata.storyReply);
    const storyId = texto(storyReply.storyId);
    const perfil = objeto(objeto(mensagem.sender).instagramProfile);
    return {
      mencaoEmStory: metadata.isStoryMention === true,
      respostaAStory: storyId ? { storyId, storyUrl: texto(storyReply.storyUrl) } : null,
      botao: texto(metadata.postbackPayload) ?? texto(metadata.quickReplyPayload),
      seguidor: typeof perfil.isFollower === "boolean" ? perfil.isFollower : null,
    };
  } catch {
    return SEM_EXTRAS;
  }
}

/** O gatilho de direct desta mensagem. Toque no botão do liberar não dispara gatilho (D13). */
export function gatilhoDoDirect(extras: ExtrasDoDirect): GatilhoDeDirect | null {
  if (disparoDoLiberar(extras.botao)) return null;
  if (extras.mencaoEmStory) return GATILHO_DE_MENCAO_EM_STORY;
  if (extras.respostaAStory) return GATILHO_DE_RESPOSTA_A_STORY;
  return GATILHO_DE_MENSAGEM_DO_INSTAGRAM;
}

/** O que o evento do gatilho de direct carrega. */
export const directDoEventoSchema = z.object({
  contact_id: z.string().min(1),
  conversation_id: z.string().min(1),
  message_id: z.string().min(1),
  channel_session_id: z.string().min(1),
  plataforma: z.enum(PLATAFORMAS_DE_COMENTARIO),
  conta_id: z.string().min(1),
  conversa_zernio_id: z.string().min(1),
  texto: z.string(),
  recebida_em: z.string(),
  seguidor: z.boolean().nullable().default(null),
  story: z.object({ id: z.string(), url: z.string().nullable() }).nullable().default(null),
});
export type DirectDoEvento = z.infer<typeof directDoEventoSchema>;

const ehDeDirect = (evento: string): evento is GatilhoDeDirect => (GATILHOS_DE_DIRECT as readonly string[]).includes(evento);

/** Para o motor: a regra casa se a conta é a do evento e o filtro casa com o texto (mention: sempre). */
export function directCasa(evento: string, triggerConfig: unknown, payload: unknown): boolean {
  if (!ehDeDirect(evento)) return false;
  const config = configDoDirectSchema.safeParse(triggerConfig);
  const direct = directDoEventoSchema.safeParse(payload);
  if (!config.success || !direct.success) return false;
  if (config.data.channel_session_id !== direct.data.channel_session_id) return false;
  if (evento === GATILHO_DE_MENCAO_EM_STORY) return true;
  return casaComFiltro(direct.data.texto, config.data.filtro);
}

export type ResultadoDoDirect = { calarIa: boolean };

interface RegraDeDirect {
  id: string;
  trigger_event: string;
  trigger_config: unknown;
}
const cacheDasRegras = new Map<string, { em: number; regras: RegraDeDirect[] }>();

/** Só para teste. */
export function limparCacheDasRegrasDeDirect(): void {
  cacheDasRegras.clear();
}

async function regrasDeDirect(admin: SupabaseClient, organizationId: string): Promise<RegraDeDirect[]> {
  const agora = Date.now();
  const guardado = cacheDasRegras.get(organizationId);
  if (guardado && agora - guardado.em < CACHE_DAS_REGRAS_DE_DIRECT_MS) return guardado.regras;
  const { data, error } = await admin
    .from("automation_rules")
    .select("id, trigger_event, trigger_config")
    .eq("organization_id", organizationId)
    .in("trigger_event", [...GATILHOS_DE_DIRECT])
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  const regras = (data ?? []) as RegraDeDirect[];
  cacheDasRegras.set(organizationId, { em: agora, regras });
  return regras;
}

/** D6: cala a IA por 10 minutos, sem nunca encurtar um silêncio maior. Erro só loga. */
async function silenciar(admin: SupabaseClient, organizationId: string, conversationId: string): Promise<void> {
  try {
    const { data } = await admin
      .from("conversations")
      .select("bot_silenced_until")
      .eq("organization_id", organizationId)
      .eq("id", conversationId)
      .maybeSingle();
    const atual = (data as { bot_silenced_until: string | null } | null)?.bot_silenced_until ?? null;
    const novo = Date.now() + SILENCIO_DA_AUTOMACAO_MS;
    // O handoff formal grava 'infinity': Date.parse dá NaN, e isso nunca pode virar "agora + 10 min".
    if (atual === "infinity") return;
    const atualMs = atual ? Date.parse(atual) : Number.NaN;
    if (!Number.isNaN(atualMs) && atualMs >= novo) return;
    // Só o silêncio: `last_handoff_*` contam como "passou para humano" nos Indicadores e na devolução automática.
    const { error } = await admin
      .from("conversations")
      .update({ bot_silenced_until: new Date(novo).toISOString() })
      .eq("organization_id", organizationId)
      .eq("id", conversationId);
    if (error) throw new Error(error.message);
  } catch (erro) {
    logger.error("[comentarios.direct] silenciar a IA falhou", { erro: erro instanceof Error ? erro.message : String(erro) });
  }
}

/** Chamado pela ingestão DEPOIS de gravar a mensagem e ANTES do despacho do agente. Nunca lança. */
export async function aoReceberDirect(
  admin: SupabaseClient,
  e: {
    organizationId: string;
    channelSessionId: string;
    contactId: string;
    conversationId: string;
    messageId: string;
    msg: SocialMessage;
    extras: ExtrasDoDirect;
  },
): Promise<ResultadoDoDirect> {
  try {
    const { msg, extras } = e;
    if (msg.direction !== "inbound" || msg.kind !== "message") return { calarIa: false };
    if (!(PLATAFORMAS_DE_COMENTARIO as readonly string[]).includes(msg.platform)) return { calarIa: false };
    const plataforma = msg.platform as "instagram" | "facebook";
    const contaId = msg.accountId;
    if (!contaId) return { calarIa: false };

    const disparoId = disparoDoLiberar(extras.botao);
    if (disparoId) {
      await liberarDirect(admin, {
        organizationId: e.organizationId,
        disparoId,
        seguidor: extras.seguidor,
        conversaZernioId: msg.conversationId,
        contaId,
      });
      await silenciar(admin, e.organizationId, e.conversationId);
      return { calarIa: true };
    }

    const gatilho = gatilhoDoDirect(extras);
    if (!gatilho) return { calarIa: false };
    if (gatilho !== GATILHO_DE_MENSAGEM_DO_INSTAGRAM && plataforma !== "instagram") return { calarIa: false };

    const agora = new Date().toISOString();
    const payload: DirectDoEvento = {
      contact_id: e.contactId,
      conversation_id: e.conversationId,
      message_id: e.messageId,
      channel_session_id: e.channelSessionId,
      plataforma,
      conta_id: contaId,
      conversa_zernio_id: msg.conversationId,
      texto: msg.text ?? "",
      recebida_em: msg.sentAt ?? agora,
      seguidor: extras.seguidor,
      story:
        gatilho === GATILHO_DE_RESPOSTA_A_STORY && extras.respostaAStory
          ? { id: extras.respostaAStory.storyId, url: extras.respostaAStory.storyUrl }
          : gatilho === GATILHO_DE_MENCAO_EM_STORY
            ? { id: msg.externalId, url: msg.attachments[0]?.url ?? null }
            : null,
    };

    const regras = (await regrasDeDirect(admin, e.organizationId)).filter((r) => r.trigger_event === gatilho);
    if (!regras.some((r) => directCasa(gatilho, r.trigger_config, payload))) return { calarIa: false };

    await silenciar(admin, e.organizationId, e.conversationId);
    const { error } = await admin.rpc("emit_event", {
      p_event_type: gatilho,
      p_entity_kind: "contact",
      p_entity_id: e.contactId,
      p_payload: payload,
      p_metadata: { source: "zernio_direct" },
      p_organization_id: e.organizationId,
    });
    if (error) logger.error("[comentarios.direct] emit_event falhou", { erro: error.message });
    return { calarIa: true };
  } catch (erro) {
    logger.error("[comentarios.direct] aoReceberDirect falhou", { erro: erro instanceof Error ? erro.message : String(erro) });
    return { calarIa: false };
  }
}
