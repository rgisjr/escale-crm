import type { SupabaseClient } from "@supabase/supabase-js";

import type { HandlerCtx } from "@/lib/api/handlers/types";
import { ORIGEM_CAMPANHA } from "@/lib/campanhas/origem-do-lead";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import { normalizarTags } from "@/lib/contacts/tag-normalizada";
import { camposParaEntrarEmEspera } from "@/lib/escale/conversas/espera";
import type { EventRow, HandlerResult } from "@/lib/event-log/dispatcher";
import { logger } from "@/lib/logger";

import { TAGS_DO_POS_ENVIO_MAX, posEnvioSchema, type PosEnvio } from "./assistente";

/**
 * O PÓS-ENVIO (fork Escale, Fase 8B; PRD B14; N12, N13). Na conclusão, a rodada
 * pede (um evento só); este consumidor anda em lotes com orçamento, MARCA cada
 * destinatário antes de agir (no máximo uma vez) e aplica, nesta ordem: tags
 * (pelo handler do contato, que emite `contact.tag_added` e acorda as
 * automações), negócio (pelo handler de negócio, com ator que não é pessoa: a
 * distribuição de dono da 1K roda), atendente e status da conversa.
 * "Em aberto" (o padrão) não mexe: o envio já abriu o atendimento.
 */
export const EVENTO_DO_POS_ENVIO = "campanhas.pos_envio_requested";
export const CONSUMIDOR_DO_POS_ENVIO = "escale-pos-envio-da-campanha.v1";
const LOTE = 100;
const ORCAMENTO_MS = 20_000;
const TAGS_DO_CONTATO_MAX = 20;

export const temAlgoParaFazer = (p: PosEnvio): boolean =>
  p.tags.length > 0 ||
  p.origemId !== null ||
  p.statusDaConversa !== "aberta" ||
  p.atendenteId !== null ||
  p.donoDoNegocio;

/** Chamada pela rodada quando a campanha conclui. Nunca lança: a rodada não pode cair por isto. */
export async function pedirPosEnvio(
  admin: SupabaseClient,
  campanhaId: string,
  org: string,
): Promise<void> {
  try {
    const { data } = await admin
      .from("campaigns")
      .select("escale_pos_envio")
      .eq("organization_id", org)
      .eq("id", campanhaId)
      .maybeSingle();
    const pos = posEnvioSchema.safeParse(
      (data as { escale_pos_envio?: unknown } | null)?.escale_pos_envio,
    );
    if (!pos.success || !temAlgoParaFazer(pos.data)) return;
    const { error } = await admin.rpc("emit_event", {
      p_event_type: EVENTO_DO_POS_ENVIO,
      p_entity_kind: "campaign",
      p_entity_id: campanhaId,
      p_payload: { campaign_id: campanhaId },
      p_metadata: {},
      p_organization_id: org,
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    logger.warn("[campanha] pedido do pós-envio falhou", {
      campanha: campanhaId,
      motivo: (err as Error).message,
    });
  }
}

export interface DependenciasDoPosEnvio {
  db: SupabaseClient;
  agora: () => number;
  mudarContato: (ctx: HandlerCtx, id: string, input: { tags: string[] }) => Promise<unknown>;
  criarNegocio: (
    ctx: HandlerCtx,
    input: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
}

type Campanha = {
  id: string;
  name: string;
  status: string;
  created_by: string | null;
  started_at: string | null;
  escale_pos_envio: unknown;
  escale_pos_envio_feito_em: string | null;
};
type Destinatario = { id: string; contact_id: string; conversation_id: string | null };
type Contato = {
  id: string;
  name: string | null;
  display_name: string | null;
  phone_number: string | null;
  tags: string[] | null;
};
type Conversa = {
  id: string;
  status: string;
  assigned_to_user_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

const resultado = (
  status: HandlerResult["status"],
  detail?: string,
  retry_at?: string,
): HandlerResult => ({
  consumer_key: CONSUMIDOR_DO_POS_ENVIO,
  status,
  ...(detail ? { detail } : {}),
  ...(retry_at ? { retry_at } : {}),
});

export async function processarPosEnvio(
  row: EventRow,
  deps: DependenciasDoPosEnvio,
): Promise<HandlerResult> {
  const org = row.organization_id;
  const campanhaId = String(
    (row.payload as { campaign_id?: unknown }).campaign_id ?? row.entity_id ?? "",
  );
  const { data } = await deps.db
    .from("campaigns")
    .select("id, name, status, created_by, started_at, escale_pos_envio, escale_pos_envio_feito_em")
    .eq("organization_id", org)
    .eq("id", campanhaId)
    .maybeSingle();
  const campanha = data as Campanha | null;
  if (!campanha || campanha.status !== "completed")
    return resultado("skipped", "campanha_nao_concluida");
  if (campanha.escale_pos_envio_feito_em) return resultado("skipped", "ja_feito");
  const lido = posEnvioSchema.safeParse(campanha.escale_pos_envio);
  if (!lido.success) return resultado("error", "pos_envio_invalido");
  const pos = lido.data;
  const ctx: HandlerCtx = {
    organization_id: org,
    actor: { type: "webhook_source", id: `campaign:${campanha.id}` },
    // Nunca `rule:…`: o motor de automações ignora evento com esse prefixo.
    requestId: `campaign-pos-envio:${campanha.id}`,
  };

  const inicio = deps.agora();
  let falhas = 0;
  while (deps.agora() - inicio < ORCAMENTO_MS) {
    const { data: fila, error } = await deps.db
      .from("campaign_recipients")
      .select("id, contact_id, conversation_id")
      .eq("organization_id", org)
      .eq("campaign_id", campanha.id)
      .not("sent_at", "is", null)
      .is("escale_pos_envio_em", null)
      .order("created_at", { ascending: true })
      .limit(LOTE);
    if (error) throw new Error(error.message);
    const lote = (fila ?? []) as Destinatario[];
    if (lote.length === 0) {
      await deps.db
        .from("campaigns")
        .update({ escale_pos_envio_feito_em: new Date().toISOString() })
        .eq("organization_id", org)
        .eq("id", campanha.id);
      return resultado("ok", falhas > 0 ? `falhas:${falhas}` : undefined);
    }
    // Marca ANTES de agir: um item roda no máximo uma vez, mesmo com retry.
    const { data: marcados, error: erroMarca } = await deps.db
      .from("campaign_recipients")
      .update({ escale_pos_envio_em: new Date().toISOString() })
      .eq("organization_id", org)
      .in(
        "id",
        lote.map((d) => d.id),
      )
      .is("escale_pos_envio_em", null)
      .select("id");
    if (erroMarca) throw new Error(erroMarca.message);
    const meus = new Set(((marcados ?? []) as Array<{ id: string }>).map((m) => m.id));
    const [contatos, conversas] = await Promise.all([
      lerContatos(
        deps.db,
        org,
        lote.map((d) => d.contact_id),
      ),
      lerConversas(
        deps.db,
        org,
        lote.flatMap((d) => (d.conversation_id ? [d.conversation_id] : [])),
      ),
    ]);
    for (const d of lote) {
      if (!meus.has(d.id)) continue;
      try {
        await aplicar(
          d,
          contatos.get(d.contact_id),
          d.conversation_id ? conversas.get(d.conversation_id) : undefined,
          pos,
          campanha,
          ctx,
          deps,
        );
      } catch (err) {
        falhas++;
        logger.warn("[campanha] pós-envio falhou para um destinatário", {
          campanha: campanha.id,
          destinatario: d.id,
          motivo: (err as Error).message,
        });
      }
    }
  }
  return resultado("retry", "orcamento", new Date(Date.now() + 1000).toISOString());
}

async function lerContatos(
  db: SupabaseClient,
  org: string,
  ids: string[],
): Promise<Map<string, Contato>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await db
    .from("contacts")
    .select("id, name, display_name, phone_number, tags")
    .eq("organization_id", org)
    .in("id", ids);
  if (error) throw new Error(error.message);
  return new Map(((data ?? []) as Contato[]).map((c) => [c.id, c]));
}

async function lerConversas(
  db: SupabaseClient,
  org: string,
  ids: string[],
): Promise<Map<string, Conversa>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await db
    .from("conversations")
    .select("id, status, assigned_to_user_id, created_at, metadata")
    .eq("organization_id", org)
    .in("id", ids);
  if (error) throw new Error(error.message);
  return new Map(((data ?? []) as Conversa[]).map((c) => [c.id, c]));
}

async function aplicar(
  d: Destinatario,
  contato: Contato | undefined,
  conversa: Conversa | undefined,
  pos: PosEnvio,
  campanha: Campanha,
  ctx: HandlerCtx,
  deps: DependenciasDoPosEnvio,
): Promise<void> {
  const org = ctx.organization_id;
  // 1. Tags: pelo handler do contato (emite `contact.tag_added` só com as novas).
  if (pos.tags.length > 0 && contato) {
    const atuais = normalizarTags(contato.tags ?? []);
    const novas = normalizarTags(pos.tags)
      .filter((t) => !atuais.includes(t))
      .slice(0, Math.max(0, TAGS_DO_CONTATO_MAX - atuais.length))
      .slice(0, TAGS_DO_POS_ENVIO_MAX);
    if (novas.length > 0)
      await deps.mudarContato(ctx, d.contact_id, { tags: [...atuais, ...novas] });
  }

  // 2. Negócio: na origem, para quem ainda não tem um aberto nela (N12).
  let dono: string | null = null;
  if (pos.origemId && pos.etapaId) {
    const { data: aberto } = await deps.db
      .from("crm_leads")
      .select("id, owner_user_id")
      .eq("organization_id", org)
      .eq("contact_id", d.contact_id)
      .eq("pipeline_id", pos.origemId)
      .eq("status", "open")
      .limit(1);
    const existente = ((aberto ?? []) as Array<{ owner_user_id: string | null }>)[0];
    if (existente) {
      dono = existente.owner_user_id;
    } else {
      const nome = contato
        ? nomeDoContato({
            name: contato.name,
            display_name: contato.display_name,
            phone_number: contato.phone_number,
          })
        : null;
      const negocio = await deps.criarNegocio(ctx, {
        pipeline_id: pos.origemId,
        stage_id: pos.etapaId,
        title: nome && nome.trim().length >= 2 ? nome.trim().slice(0, 200) : "Novo negócio",
        contact_id: d.contact_id,
        tags: [],
        source: ORIGEM_CAMPANHA,
        source_metadata: { campaign_id: campanha.id, campaign_name: campanha.name },
      });
      dono = (negocio.owner_user_id as string | null | undefined) ?? null;
    }
  }

  if (!conversa) return;
  const existente = campanha.started_at !== null && conversa.created_at < campanha.started_at;

  // 3. Atendente: o dono do negócio quando pedido, senão o escolhido.
  const alvo = (pos.donoDoNegocio ? dono : null) ?? pos.atendenteId;
  const manter = pos.manterAtendente && existente && conversa.assigned_to_user_id !== null;
  if (alvo && !manter && conversa.assigned_to_user_id !== alvo) {
    const { error } = await deps.db.rpc("fn_conversation_assign", {
      p_organization_id: org,
      p_conversation_id: conversa.id,
      p_to_user_id: alvo,
      p_reason: "routing",
    });
    if (error) throw new Error(`atendente: ${error.message}`);
  }

  // 4. Status da conversa.
  if (pos.statusDaConversa === "aberta" || (pos.manterStatus && existente)) return;
  if (pos.statusDaConversa === "fechada") {
    const { error } = await deps.db.rpc("fn_service_status", {
      p_org: org,
      p_conversation: conversa.id,
      p_status: "closed",
    });
    if (error) throw new Error(`status: ${error.message}`);
    return;
  }
  if (!campanha.created_by) return;
  const { error } = await deps.db
    .from("conversations")
    .update(camposParaEntrarEmEspera(campanha.created_by, new Date(), conversa.metadata ?? {}))
    .eq("organization_id", org)
    .eq("id", conversa.id);
  if (error) throw new Error(`em espera: ${error.message}`);
}
