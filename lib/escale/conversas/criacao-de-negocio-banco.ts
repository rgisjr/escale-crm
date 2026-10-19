import type { SupabaseClient } from "@supabase/supabase-js";

import { ORIGEM_DO_WHATSAPP } from "@/lib/channels/origem-do-negocio";
import {
  ehIdentificadorTecnico,
  rotuloDoContato,
  SEM_NOME,
} from "@/lib/contacts/rotulo-do-contato";
import { emitLeadActivity } from "@/lib/leads/activity-emitter";
import type { DadosDoNascimento, NascimentoDoLead } from "@/lib/leads/nascimento-do-lead";
import { logger } from "@/lib/logger";

import { lerCriacao, primeiraRegraQueCasa, type RegraDeCriacao } from "./criacao-de-negocio";

/**
 * O NASCIMENTO PELO DISPOSITIVO (fork Escale, Fase 3E; F1; N3–N7). Chamado pelo
 * encaixe em `garantirLeadDaConversa` com o service role do ingest. `null` =
 * dispositivo nunca configurado: o original segue (origem padrão, risco 7).
 */
export type DecisaoDoDispositivo =
  | { tipo: "padrao" }
  | { tipo: "nenhum"; motivo: "desligado" | "sem_texto" | "nao_e_a_primeira" | "sem_regra" }
  | { tipo: "regra"; regra: RegraDeCriacao };

export async function decisaoDoDispositivo(
  db: SupabaseClient,
  q: {
    organizationId: string;
    conversationId: string;
    texto: string | null;
    messageId: string | null;
  },
): Promise<DecisaoDoDispositivo> {
  const { data: conversa } = await db
    .from("conversations")
    .select("id, channel_session_id")
    .eq("organization_id", q.organizationId)
    .eq("id", q.conversationId)
    .maybeSingle();
  const canal = (conversa as { channel_session_id?: string } | null)?.channel_session_id;
  if (!canal) return { tipo: "padrao" };
  const { data: linha } = await db
    .from("crm_criacao_de_negocio")
    .select("ligado, regras")
    .eq("organization_id", q.organizationId)
    .eq("channel_session_id", canal)
    .maybeSingle();
  if (!linha) return { tipo: "padrao" };
  const criacao = lerCriacao(linha);
  if (!criacao.ligado) return { tipo: "nenhum", motivo: "desligado" };
  if (q.texto === null) return { tipo: "nenhum", motivo: "sem_texto" };
  const { data: primeira } = await db
    .from("messages")
    .select("id")
    .eq("organization_id", q.organizationId)
    .eq("conversation_id", q.conversationId)
    .eq("direction", "inbound")
    .order("sent_at", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!primeira || (q.messageId && (primeira as { id: string }).id !== q.messageId))
    return { tipo: "nenhum", motivo: "nao_e_a_primeira" };
  const regra = primeiraRegraQueCasa(criacao.regras, q.texto);
  return regra ? { tipo: "regra", regra } : { tipo: "nenhum", motivo: "sem_regra" };
}

type ContatoLido = {
  display_name?: string | null;
  name?: string | null;
  phone_number?: string | null;
} | null;

export async function nascimentoPeloDispositivo(
  db: SupabaseClient,
  dados: DadosDoNascimento,
  contato: ContatoLido,
): Promise<NascimentoDoLead | null> {
  const decisao = await decisaoDoDispositivo(db, {
    organizationId: dados.organizationId,
    conversationId: dados.conversationId,
    texto: dados.texto ?? null,
    messageId: dados.messageId ?? null,
  });
  if (decisao.tipo === "padrao") return null;
  if (decisao.tipo === "nenhum")
    return { criado: false, motivo: "pelo_dispositivo", detalhe: decisao.motivo };
  const origem = dados.origem ?? ORIGEM_DO_WHATSAPP;
  const doCadastro = rotuloDoContato(contato);
  const doPayload = (dados.nomeDoContato ?? "").trim();
  const titulo =
    doCadastro !== SEM_NOME
      ? doCadastro
      : doPayload && !ehIdentificadorTecnico(doPayload)
        ? doPayload
        : `Novo contato pelo ${origem.rotulo}`;
  const { regra } = decisao;
  const { data: leadId, error } = await db.rpc("fn_escale_nascer_negocio_do_dispositivo", {
    p_org: dados.organizationId,
    p_contact: dados.contactId,
    p_pipeline: regra.origem_id,
    p_stage: regra.etapa_id,
    p_title: titulo,
    p_source: origem.source,
    p_source_metadata: {},
    p_tags_do_contato: regra.tags,
  });
  if (error) return { criado: false, motivo: "erro", detalhe: error.message.slice(0, 120) };
  if (!leadId) return { criado: false, motivo: "ja_existe" };
  const id = leadId as string;
  await emitLeadActivity(db, {
    organizationId: dados.organizationId,
    leadId: id,
    contactId: dados.contactId,
    type: "lead_created",
    sourceModule: "canal.ingest",
    sourceId: dados.conversationId,
    actor: { type: "webhook_source", id: "canal-inbound" },
    reason: `${origem.motivo} (${regra.nome})`,
    payload: { conversation_id: dados.conversationId, condicao: regra.nome },
  });
  const { error: erroEvento } = await db.rpc("emit_event", {
    p_event_type: "lead.created",
    p_entity_kind: "crm_lead",
    p_entity_id: id,
    p_payload: {
      pipeline_id: regra.origem_id,
      stage_id: regra.etapa_id,
      conversation_id: dados.conversationId,
    },
    p_metadata: { source: "criacao-pelo-dispositivo" },
    p_organization_id: dados.organizationId,
  });
  if (erroEvento)
    logger.warn("criacao-pelo-dispositivo: lead.created não emitido", {
      organization_id: dados.organizationId,
      lead_id: id,
    });
  if (regra.manter_atendente)
    await manterAtendente(db, dados.organizationId, dados.conversationId, id);
  return { criado: true, leadId: id, pipelineId: regra.origem_id, stageId: regra.etapa_id };
}

/** N7: a conversa vai para o dono que a distribuição da 1K deu ao negócio. Falha vira aviso. */
async function manterAtendente(
  db: SupabaseClient,
  org: string,
  conversationId: string,
  leadId: string,
): Promise<void> {
  try {
    const { data: lead } = await db
      .from("crm_leads")
      .select("id, owner_user_id")
      .eq("organization_id", org)
      .eq("id", leadId)
      .maybeSingle();
    const dono = (lead as { owner_user_id?: string | null } | null)?.owner_user_id;
    if (!dono) return;
    const { data: conversa } = await db
      .from("conversations")
      .select("id, assigned_to_user_id")
      .eq("organization_id", org)
      .eq("id", conversationId)
      .maybeSingle();
    if ((conversa as { assigned_to_user_id?: string | null } | null)?.assigned_to_user_id === dono)
      return;
    const { error } = await db.rpc("fn_conversation_assign", {
      p_organization_id: org,
      p_conversation_id: conversationId,
      p_to_user_id: dono,
      p_reason: "routing",
      p_expected_assignee: null as unknown as string,
      p_enforce_expected: false,
    });
    if (error)
      logger.warn("criacao-pelo-dispositivo: atendente não mantido", {
        organization_id: org,
        conversation_id: conversationId,
        error: error.message.slice(0, 120),
      });
  } catch (err) {
    logger.warn("criacao-pelo-dispositivo: atendente não mantido", {
      organization_id: org,
      detail: err instanceof Error ? err.message.slice(0, 120) : "erro",
    });
  }
}
