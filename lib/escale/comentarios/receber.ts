import type { SupabaseClient } from "@supabase/supabase-js";

import { upsertSocialContact } from "@/lib/channels/zernio/ingest";

import { caminhoDoComentario, type ComentarioDoEvento } from "./caminhos";
import { GATILHO_DE_COMENTARIO, PLATAFORMAS_DE_COMENTARIO, type PlataformaDeComentario } from "./constantes";
import { lerComentarioDoWebhook } from "./webhook";

/**
 * FORK ESCALE · Fase 10B: a entrada do webhook `comment.received` do Zernio. Só vira contato e evento
 * quando alguma automação ativa quer aquele comentário (D12): sem isso cada comentário de qualquer
 * post criaria um contato. A mesma identidade do direct (`<rede>:<conta>:<autor>`) mantém um contato só.
 */
export type ResultadoDoComentario = { status: "ingested" | "ignored"; reason?: string };

const ehPlataformaDeComentario = (p: string): p is PlataformaDeComentario =>
  (PLATAFORMAS_DE_COMENTARIO as readonly string[]).includes(p);

export async function receberComentario(
  db: SupabaseClient,
  canal: { organizationId: string; channelSessionId: string; contaId: string; plataforma: string },
  payload: unknown,
): Promise<ResultadoDoComentario> {
  const lido = lerComentarioDoWebhook(payload);
  if (!lido) return { status: "ignored", reason: "comentario_ilegivel" };
  if (lido.contaId !== canal.contaId || lido.plataforma !== canal.plataforma) {
    return { status: "ignored", reason: "comentario_de_outra_conta" };
  }
  if (!ehPlataformaDeComentario(lido.plataforma)) return { status: "ignored", reason: "rede_sem_comentario" };
  if (lido.autor.daPropriaConta) return { status: "ignored", reason: "comentario_da_propria_conta" };
  if (lido.comentario.aoVivo) return { status: "ignored", reason: "comentario_de_live" };

  const { data: regras, error: erroDasRegras } = await db
    .from("automation_rules")
    .select("trigger_config")
    .eq("organization_id", canal.organizationId)
    .eq("trigger_event", GATILHO_DE_COMENTARIO)
    .eq("is_active", true);
  if (erroDasRegras) throw new Error("comentario_regras_lookup_failed");

  const { comentario, autor, publicacao } = lido;
  const semContato: Omit<ComentarioDoEvento, "contact_id"> = {
    channel_session_id: canal.channelSessionId,
    plataforma: lido.plataforma,
    conta_id: lido.contaId,
    comentario: {
      id: comentario.id,
      texto: comentario.texto,
      comentado_em: comentario.comentadoEm,
      publicacao_id: comentario.publicacaoId,
      publicacao_zernio_id: comentario.publicacaoZernioId,
      autor: { id: autor.id, usuario: autor.usuario, nome: autor.nome },
    },
    publicacao: { legenda: publicacao.legenda, miniatura: publicacao.miniatura, link: publicacao.link },
  };
  const algumaQuer = (regras ?? []).some((r) => caminhoDoComentario((r as { trigger_config: unknown }).trigger_config, semContato));
  if (!algumaQuer) return { status: "ignored", reason: "nenhum_caminho_casou" };

  const contactId = await upsertSocialContact(
    db,
    canal.organizationId,
    `${lido.plataforma}:${lido.contaId}:${autor.id}`,
    autor.nome ?? autor.usuario,
  );
  const { error } = await db.rpc("emit_event", {
    p_event_type: GATILHO_DE_COMENTARIO,
    p_entity_kind: "contact",
    p_entity_id: contactId,
    p_payload: { ...semContato, contact_id: contactId },
    p_metadata: { source: "zernio_comment", ...(lido.eventoId ? { zernio_event_id: lido.eventoId } : {}) },
    p_organization_id: canal.organizationId,
  });
  // Lança de propósito: a rota responde 500 e o Zernio reentrega; o índice único do disparo segura a repetição.
  if (error) throw new Error(`comentario_emit_event_failed: ${error.message}`);
  return { status: "ingested" };
}
