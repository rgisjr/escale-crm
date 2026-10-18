/**
 * GET/POST /api/v1/leads/:id/notas — as NOTAS do negócio (fork Escale, Fase 1H; C15).
 *
 * GET: qualquer papel (a RLS mostra só as notas de negócio que a pessoa vê).
 * POST: agent ou acima; a nota nasce com `user_id` e `user_nome` da sessão, e
 * a linha do tempo ganha a atividade `note` com o PONTEIRO (`payload.nota_id`),
 * nunca o texto (PII fica só na tabela de notas). A organização vem da sessão
 * e o contato, do negócio: nenhum dos dois vem do corpo (o schema é estrito).
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import {
  COLUNAS_DA_NOTA,
  ehPermissaoNegada,
  nomeDoAutor,
  notaSchema,
  type Nota,
} from "@/lib/escale/negocio/notas";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { emitLeadActivity } from "@/lib/leads/activity-emitter";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}
const uuidValido = (id: string) => z.string().uuid().safeParse(id).success;

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_notas_do_negocio" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!uuidValido(id))
    return fail("not_found", t("Esse negócio não existe ou foi removido"), 404, { requestId });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_notas_do_negocio")
    .select(COLUNAS_DA_NOTA)
    .eq("organization_id", authz.org.orgId)
    .eq("lead_id", id)
    .order("created_at", { ascending: false });
  if (error) {
    logger.error("notas.listar", { requestId, error: error.message });
    return fail("internal_error", t("Não consegui carregar as notas."), 500, { requestId });
  }
  return ok((data ?? []) as Nota[], { requestId });
}

export async function POST(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_notas_do_negocio" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!uuidValido(id))
    return fail("not_found", t("Esse negócio não existe ou foi removido"), 404, { requestId });

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = notaSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail(
      "unprocessable_entity",
      t("A nota precisa de texto, com até 4.000 caracteres."),
      422,
      { requestId },
    );
  }

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("crm_leads")
    .select("id, contact_id")
    .eq("organization_id", authz.org.orgId)
    .eq("id", id)
    .maybeSingle();
  if (!lead)
    return fail("not_found", t("Esse negócio não existe ou foi removido"), 404, { requestId });

  const { data: nota, error } = await supabase
    .from("crm_notas_do_negocio")
    .insert({
      organization_id: authz.org.orgId,
      lead_id: id,
      contact_id: lead.contact_id ?? null,
      user_id: authz.user.id,
      user_nome: nomeDoAutor(authz.user),
      texto: parsed.data.texto,
    })
    .select(COLUNAS_DA_NOTA)
    .single();
  if (ehPermissaoNegada(error)) {
    return fail("forbidden", t("Você não tem permissão para anotar neste negócio."), 403, {
      requestId,
    });
  }
  if (error || !nota) {
    logger.error("notas.criar", { requestId, error: error?.message });
    return fail("internal_error", t("Ocorreu um erro ao salvar a nota!"), 500, { requestId });
  }

  const criada = nota as Nota;
  // Fire-and-forget, como todo emissor da linha do tempo: a nota já está gravada.
  void emitLeadActivity(supabase, {
    organizationId: authz.org.orgId,
    leadId: id,
    contactId: lead.contact_id ?? null,
    type: "note",
    sourceModule: "escale",
    sourceId: criada.id,
    actor: { type: "user", id: authz.user.id, role: authz.org.role },
    reason: "Nova nota",
    payload: { nota_id: criada.id },
  });
  void audit({
    action: "lead.note_added",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_notas_do_negocio",
    resourceId: criada.id,
    requestId,
    metadata: { lead_id: id },
  });
  return ok(criada, { requestId, status: 201 });
}
