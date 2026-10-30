import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { editarPasta, excluirPasta } from "@/lib/escale/automacoes/banco";
import { edicaoDaPastaSchema } from "@/lib/escale/automacoes/schema";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

const ehUuid = (id: string): boolean => z.string().uuid().safeParse(id).success;

/** PATCH /api/v1/automacoes-da-casca/pastas/:id — nome, cor e ícone (fork Escale, Fase 5A). */
export async function PATCH(req: NextRequest, ctx: Contexto): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!ehUuid(id)) return fail("not_found", t("Pasta não encontrada."), 404, { requestId });
  const lido = edicaoDaPastaSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) return fail("validation_failed", t("Falha na validação dos dados!"), 422, { requestId });
  try {
    const r = await editarPasta(await createClient(), authz.org.orgId, id, lido.data);
    if (r === "nao_encontrada") return fail("not_found", t("Pasta não encontrada."), 404, { requestId });
    void audit({
      action: "automation.folder_updated",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "automation_folder",
      resourceId: id,
      requestId,
      metadata: { campos: Object.keys(lido.data) },
    });
    return ok({ id }, { requestId });
  } catch (err) {
    console.error("[automacoes-da-casca] editar pasta", requestId, err);
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}

/** DELETE /api/v1/automacoes-da-casca/pastas/:id — as automações dela ficam sem pasta. */
export async function DELETE(_req: NextRequest, ctx: Contexto): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!ehUuid(id)) return fail("not_found", t("Pasta não encontrada."), 404, { requestId });
  try {
    const r = await excluirPasta(await createClient(), authz.org.orgId, id);
    if (r === "nao_encontrada") return fail("not_found", t("Pasta não encontrada."), 404, { requestId });
    void audit({
      action: "automation.folder_deleted",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "automation_folder",
      resourceId: id,
      requestId,
    });
    return ok({ id }, { requestId });
  } catch (err) {
    console.error("[automacoes-da-casca] excluir pasta", requestId, err);
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}
