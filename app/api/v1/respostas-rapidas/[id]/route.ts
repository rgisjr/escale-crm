import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { fail, noContent, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole, type RoleCheck } from "@/lib/auth/require-role";
import { roleAtLeast } from "@/lib/auth/types";
import { gravarExtras } from "@/lib/escale/conversas/respostas-banco";
import { respostaSchema } from "@/lib/escale/conversas/respostas";
import { pode } from "@/lib/escale/conversas/setores-banco";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
type Ok = Extract<RoleCheck, { ok: true }>;

/**
 * Quem mexe numa resposta (N14): a própria, pela sessão; a compartilhada, o
 * gerente pela sessão; a de outra pessoa (ou a compartilhada sem ser gerente),
 * quem tem "Editar ou excluir respostas rápidas", pelo service role.
 */
async function escolherCliente(
  authz: Ok,
  sessao: SupabaseClient,
  id: string,
): Promise<SupabaseClient | "nao_achou" | "proibido"> {
  const { data } = await createAdminClient()
    .from("message_templates")
    .select("id, owner_user_id")
    .eq("organization_id", authz.org.orgId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return "nao_achou";
  const dono = (data as { owner_user_id: string | null }).owner_user_id;
  if (dono === authz.user.id) return sessao;
  if (dono === null && roleAtLeast(authz.org.role, "manager")) return sessao;
  return (await pode(sessao, authz.org.orgId, "CHAT_EDIT_QUICK_RESPONSE"))
    ? createAdminClient()
    : "proibido";
}

async function preparar(ctx: Ctx) {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "message_templates" });
  if (!authz.ok) return { erro: authz.response } as const;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const id = lerUuid((await ctx.params).id);
  if (!id)
    return { erro: fail("not_found", t("Resposta não encontrada."), 404, { requestId }) } as const;
  const db = await escolherCliente(authz, await createClient(), id);
  if (db === "nao_achou")
    return { erro: fail("not_found", t("Resposta não encontrada."), 404, { requestId }) } as const;
  if (db === "proibido")
    return {
      erro: fail(
        "forbidden",
        t("Você não pode editar respostas rápidas de outros usuários."),
        403,
        { requestId },
      ),
    } as const;
  return { requestId, authz, t, id, db } as const;
}

export async function PATCH(req: NextRequest, ctx: Ctx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const p = await preparar(ctx);
  if ("erro" in p) return p.erro as Response;
  const { requestId, authz, t, id, db } = p;
  const lido = await lerJson(req);
  const parsed = respostaSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  const r = parsed.data;
  if (
    r.compartilhar &&
    !roleAtLeast(authz.org.role, "manager") &&
    !(await pode(await createClient(), authz.org.orgId, "CHAT_SHARE_QUICK_RESPONSE"))
  ) {
    return fail("forbidden", t("Você não pode compartilhar respostas rápidas."), 403, {
      requestId,
    });
  }
  const { error } = await db
    .from("message_templates")
    .update({
      title: r.atalho,
      shortcut: r.atalho,
      body: r.corpo,
      owner_user_id: r.compartilhar ? null : authz.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", authz.org.orgId)
    .eq("id", id);
  if (error) return fail("internal_error", error.message, 500, { requestId });
  try {
    await gravarExtras(db, authz.org.orgId, id, r);
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
  void audit({
    action: "quick_reply.updated",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "message_template",
    resourceId: id,
    requestId,
  });
  return ok({ id }, { requestId });
}

export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const p = await preparar(ctx);
  if ("erro" in p) return p.erro as Response;
  const { requestId, authz, id, db } = p;
  const { error } = await db
    .from("message_templates")
    .delete()
    .eq("organization_id", authz.org.orgId)
    .eq("id", id);
  if (error) return fail("internal_error", error.message, 500, { requestId });
  void audit({
    action: "quick_reply.deleted",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "message_template",
    resourceId: id,
    requestId,
  });
  return noContent(requestId);
}
