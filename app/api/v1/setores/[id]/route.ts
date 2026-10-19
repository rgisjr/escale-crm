import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, noContent, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { trocarMembros } from "@/lib/escale/conversas/setores-banco";
import { setorSchema } from "@/lib/escale/conversas/setores";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

async function preparar(ctx: Ctx) {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return { erro: supportDenied } as const;
  const authz = await requireRole("agent", { requestId, resource: "crm_setores" });
  if (!authz.ok) return { erro: authz.response } as const;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const id = lerUuid((await ctx.params).id);
  if (!id)
    return { erro: fail("not_found", t("Setor não encontrado."), 404, { requestId }) } as const;
  return { requestId, authz, t, id, supabase: await createClient() } as const;
}

/** "Salvar alterações" de "Editar setor" (c88). */
export async function PATCH(req: NextRequest, ctx: Ctx): Promise<Response> {
  const p = await preparar(ctx);
  if ("erro" in p) return p.erro as Response;
  const { requestId, authz, t, id, supabase } = p;
  const lido = await lerJson(req);
  const parsed = setorSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  const { data, error } = await supabase
    .from("crm_setores")
    .update({ nome: parsed.data.nome, cor: parsed.data.cor })
    .eq("organization_id", authz.org.orgId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23505")
      return fail("conflict", t("Já existe um setor com esse nome."), 409, { requestId });
    if (error.code === "42501")
      return fail("forbidden", t("Você não pode editar setores."), 403, { requestId });
    return fail("internal_error", error.message, 500, { requestId });
  }
  if (!data) return fail("not_found", t("Setor não encontrado."), 404, { requestId });
  try {
    await trocarMembros(supabase, authz.org.orgId, id, parsed.data.membros);
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
  void audit({
    action: "crm_setor.updated",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_setor",
    resourceId: id,
    requestId,
    metadata: { nome: parsed.data.nome, membros: parsed.data.membros.length },
  });
  return ok({ id }, { requestId });
}

/** "Remover setor" (c87). Os vínculos saem em cascata; as conversas voltam ao setor do dispositivo. */
export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const p = await preparar(ctx);
  if ("erro" in p) return p.erro as Response;
  const { requestId, authz, t, id, supabase } = p;
  const { data, error } = await supabase
    .from("crm_setores")
    .delete()
    .eq("organization_id", authz.org.orgId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "42501")
      return fail("forbidden", t("Você não pode editar setores."), 403, { requestId });
    return fail("internal_error", t("Erro ao remover setor"), 500, { requestId });
  }
  if (!data) return fail("not_found", t("Setor não encontrado."), 404, { requestId });
  void audit({
    action: "crm_setor.deleted",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_setor",
    resourceId: id,
    requestId,
  });
  return noContent(requestId);
}
