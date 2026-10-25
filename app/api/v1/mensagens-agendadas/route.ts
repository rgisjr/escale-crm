import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import {
  dataNoPassado,
  listaDeAgendadasSchema,
  novaAgendadaSchema,
} from "@/lib/escale/conversas/agendadas";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { limiteDoDiaNoFuso } from "@/lib/escale/conversas/limite-do-dia";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

import { COLUNAS_DA_AGENDADA, agendadaLida } from "./_comum";

export const dynamic = "force-dynamic";

/**
 * FORK ESCALE · Fase 3B (C9): as mensagens agendadas da organização, pela
 * SESSÃO (RLS: agente+ lê as da organização).
 *
 * Os filtros são os da tela "Configurações › Mensagens agendadas" (c39):
 * busca por nome/e-mail/telefone do contato, período de criação, período de
 * envio, dispositivo ou contato. Lista só as pendentes, salvo `?status=falhou`.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const url = new URL(req.url);
  const parsed = listaDeAgendadasSchema.safeParse({
    busca: url.searchParams.get("busca") ?? undefined,
    criacao_de: url.searchParams.get("criacao_de") ?? undefined,
    criacao_ate: url.searchParams.get("criacao_ate") ?? undefined,
    envio_de: url.searchParams.get("envio_de") ?? undefined,
    envio_ate: url.searchParams.get("envio_ate") ?? undefined,
    channel_session_id: url.searchParams.get("channel_session_id") ?? undefined,
    contact_id: url.searchParams.get("contact_id") ?? undefined,
    conversation_id: url.searchParams.get("conversation_id") ?? undefined,
    pagina: url.searchParams.get("pagina") ?? undefined,
    por_pagina: url.searchParams.get("por_pagina") ?? undefined,
  });
  if (!parsed.success) return fail("validation_failed", t("Filtro inválido."), 422, { requestId });
  const f = parsed.data;
  const status = url.searchParams.get("status") === "falhou" ? "falhou" : "pendente";
  const supabase = await createClient();
  const fuso = await fusoDaOrganizacao(supabase, authz.org.orgId, authz.org.timezone);
  let q = supabase
    .from("crm_mensagens_agendadas")
    // Com busca, o embed do contato vira `!inner`: sem isso o PostgREST filtra só o contato
    // embutido e devolve TODAS as linhas (B1-8), com o total errado.
    .select(
      f.busca
        ? COLUNAS_DA_AGENDADA.replace("contacts:contact_id (", "contacts:contact_id!inner (")
        : COLUNAS_DA_AGENDADA,
      { count: "exact" },
    )
    .eq("organization_id", authz.org.orgId)
    .eq("status", status)
    .order("enviar_em", { ascending: true })
    .order("id", { ascending: true })
    .range((f.pagina - 1) * f.por_pagina, f.pagina * f.por_pagina - 1);
  if (f.criacao_de) q = q.gte("created_at", limiteDoDiaNoFuso(f.criacao_de, "inicio", fuso));
  if (f.criacao_ate) q = q.lte("created_at", limiteDoDiaNoFuso(f.criacao_ate, "fim", fuso));
  if (f.envio_de) q = q.gte("enviar_em", limiteDoDiaNoFuso(f.envio_de, "inicio", fuso));
  if (f.envio_ate) q = q.lte("enviar_em", limiteDoDiaNoFuso(f.envio_ate, "fim", fuso));
  if (f.channel_session_id) q = q.eq("channel_session_id", f.channel_session_id);
  if (f.contact_id) q = q.eq("contact_id", f.contact_id);
  if (f.conversation_id) q = q.eq("conversation_id", f.conversation_id);
  if (f.busca) {
    // A busca é pelo contato embutido: PostgREST filtra a relação com `!inner` + `or` nela.
    const termo = f.busca.replace(/[%,()]/g, " ").trim();
    q = q.or(
      `name.ilike.%${termo}%,display_name.ilike.%${termo}%,phone_number.ilike.%${termo}%,email.ilike.%${termo}%`,
      { referencedTable: "contacts" },
    );
  }
  const { data, error, count } = await q;
  if (error) return falhaInesperadaDoQuadro(error, { rota: "mensagens-agendadas", operacao: "listar" }, t, requestId);
  return ok((data ?? []).map(agendadaLida), {
    requestId,
    meta: { total: count ?? 0, pagina: f.pagina, por_pagina: f.por_pagina },
  });
}

/** "Confirmar" da janela "Agendar mensagem" (c08): uma linha por mensagem, todas na mesma hora. */
export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("agent", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = await lerJson(req);
  const parsed = novaAgendadaSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  const nova = parsed.data;
  if (dataNoPassado(nova.enviar_em, new Date())) {
    return fail(
      "validation_failed",
      t("Não é possível agendar para uma data/hora no passado"),
      422,
      { requestId },
    );
  }
  const supabase = await createClient();
  const { data: conversa, error: erroDaConversa } = await supabase
    .from("conversations")
    .select("id, organization_id, contact_id, channel_session_id")
    .eq("organization_id", authz.org.orgId)
    .eq("id", nova.conversation_id)
    .maybeSingle();
  if (erroDaConversa) return fail("internal_error", erroDaConversa.message, 500, { requestId });
  if (!conversa) return fail("not_found", t("Conversa não encontrada."), 404, { requestId });

  const linhas = nova.mensagens.map((m) => ({
    organization_id: authz.org.orgId,
    conversation_id: conversa.id,
    contact_id: conversa.contact_id,
    channel_session_id: conversa.channel_session_id,
    tipo: m.tipo,
    corpo: m.tipo === "texto" ? m.corpo : null,
    template: m.tipo === "template" ? m.template : null,
    enviar_em: nova.enviar_em,
    criado_por: authz.user.id,
  }));
  const { data, error } = await supabase
    .from("crm_mensagens_agendadas")
    .insert(linhas)
    .select("id");
  if (error) return fail("internal_error", error.message, 500, { requestId });
  const ids = (data ?? []).map((l: { id: string }) => l.id);
  void audit({
    action: "conversation_message.scheduled",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "conversation",
    resourceId: conversa.id,
    requestId,
    metadata: { enviar_em: nova.enviar_em, mensagens: ids.length },
  });
  return ok({ ids }, { status: 201, requestId });
}
