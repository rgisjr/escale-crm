/** FORK ESCALE · Fase 2E (Q5): editar e apagar uma nota do contato (soltas ou de negócio visível; a RLS decide). */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, noContent, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import {
  COLUNAS_DA_NOTA,
  ehPermissaoNegada,
  notaSchema,
  type Nota,
} from "@/lib/escale/negocio/notas";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string; notaId: string }>;
}
const uuidValido = (id: string) => z.string().uuid().safeParse(id).success;

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Zero linhas afetadas: a nota some para quem não a vê (404) ou a RLS recusou a escrita (403). */
async function recusaSemLinhas(
  supabase: Supabase,
  orgId: string,
  contatoId: string,
  notaId: string,
  t: (texto: string) => string,
  requestId: string,
): Promise<Response> {
  const { data: existe } = await supabase
    .from("crm_notas_do_negocio")
    .select("id")
    .eq("organization_id", orgId)
    .eq("contact_id", contatoId)
    .eq("id", notaId)
    .maybeSingle();
  if (existe) {
    return fail(
      "forbidden",
      t("Só quem escreveu a nota, ou um gerente, pode editar ou remover."),
      403,
      { requestId },
    );
  }
  return fail("not_found", t("Nota não encontrada."), 404, { requestId });
}

export async function PATCH(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_notas_do_negocio" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id, notaId } = await ctx.params;
  if (!uuidValido(id) || !uuidValido(notaId))
    return fail("not_found", t("Nota não encontrada."), 404, { requestId });

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
  const { data, error } = await supabase
    .from("crm_notas_do_negocio")
    .update({ texto: parsed.data.texto })
    .eq("organization_id", authz.org.orgId)
    .eq("contact_id", id)
    .eq("id", notaId)
    .select(COLUNAS_DA_NOTA)
    .maybeSingle();
  if (ehPermissaoNegada(error)) {
    return fail(
      "forbidden",
      t("Só quem escreveu a nota, ou um gerente, pode editar ou remover."),
      403,
      { requestId },
    );
  }
  if (error) {
    logger.error("notas.editar", { requestId, error: error.message });
    return fail("internal_error", t("Ocorreu um erro ao salvar a nota!"), 500, { requestId });
  }
  if (!data) return recusaSemLinhas(supabase, authz.org.orgId, id, notaId, t, requestId);

  void audit({
    action: "contact.note_edited",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_notas_do_negocio",
    resourceId: notaId,
    requestId,
    metadata: { contact_id: id },
  });
  return ok(data as Nota, { requestId });
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_notas_do_negocio" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id, notaId } = await ctx.params;
  if (!uuidValido(id) || !uuidValido(notaId))
    return fail("not_found", t("Nota não encontrada."), 404, { requestId });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_notas_do_negocio")
    .delete()
    .eq("organization_id", authz.org.orgId)
    .eq("contact_id", id)
    .eq("id", notaId)
    .select("id");
  if (ehPermissaoNegada(error)) {
    return fail(
      "forbidden",
      t("Só quem escreveu a nota, ou um gerente, pode editar ou remover."),
      403,
      { requestId },
    );
  }
  if (error) {
    logger.error("notas.remover", { requestId, error: error.message });
    return fail("internal_error", t("Ocorreu um erro ao remover a nota!"), 500, { requestId });
  }
  if (!data || data.length === 0)
    return recusaSemLinhas(supabase, authz.org.orgId, id, notaId, t, requestId);

  void audit({
    action: "contact.note_removed",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_notas_do_negocio",
    resourceId: notaId,
    requestId,
    metadata: { contact_id: id },
  });
  return noContent(requestId);
}
