import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { COLUNAS_DA_NOTA, ehPermissaoNegada, nomeDoAutor, notaSchema, type Nota } from "@/lib/escale/negocio/notas";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * AS NOTAS DO CONTATO (fork Escale, Fase 2E; Q5, N8). GET: todas as notas do
 * contato que a RLS deixa ver (as soltas e as dos negócios visíveis). POST: a nota
 * solta (`lead_id` nulo), feita pela janela do contato.
 */
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
  if (!uuidValido(id)) return fail("not_found", t("Não consegui carregar o contato."), 404, { requestId });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_notas_do_negocio")
    .select(COLUNAS_DA_NOTA)
    .eq("organization_id", authz.org.orgId)
    .eq("contact_id", id)
    .order("created_at", { ascending: false });
  if (error) {
    logger.error("notas-do-contato.ler", { requestId, error: error.message });
    return fail("internal_error", t("Ocorreu um erro ao carregar as notas."), 500, { requestId });
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
  if (!uuidValido(id)) return fail("not_found", t("Não consegui carregar o contato."), 404, { requestId });

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = notaSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("A nota precisa de texto, com até 4.000 caracteres."), 422, { requestId });
  }

  const supabase = await createClient();
  const { data: contato } = await supabase
    .from("contacts")
    .select("id")
    .eq("organization_id", authz.org.orgId)
    .eq("id", id)
    .maybeSingle();
  if (!contato) return fail("not_found", t("Não consegui carregar o contato."), 404, { requestId });

  const { data: nota, error } = await supabase
    .from("crm_notas_do_negocio")
    .insert({
      organization_id: authz.org.orgId,
      lead_id: null,
      contact_id: id,
      user_id: authz.user.id,
      user_nome: nomeDoAutor(authz.user),
      texto: parsed.data.texto,
    })
    .select(COLUNAS_DA_NOTA)
    .single();
  if (ehPermissaoNegada(error)) {
    return fail("forbidden", t("Você não tem permissão para anotar neste contato."), 403, { requestId });
  }
  if (error || !nota) {
    logger.error("notas-do-contato.criar", { requestId, error: error?.message });
    return fail("internal_error", t("Ocorreu um erro ao salvar a nota!"), 500, { requestId });
  }
  const criada = nota as Nota;
  void audit({
    action: "contact.note_added",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_notas_do_negocio",
    resourceId: criada.id,
    requestId,
    metadata: { contact_id: id },
  });
  return ok(criada, { requestId, status: 201 });
}
