import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { listarSetores, trocarMembros } from "@/lib/escale/conversas/setores-banco";
import { setorSchema } from "@/lib/escale/conversas/setores";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Os setores da organização (c38): agente+ lê (o setor aparece na fila e no cabeçalho). */
export async function GET(_req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_setores" });
  if (!authz.ok) return authz.response;
  try {
    return ok(await listarSetores(await createClient(), authz.org.orgId), { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message ?? "erro", 500, { requestId });
  }
}

/** "Criar setor" (c42). A RLS exige "Editar ou excluir setores" (42501 → 403). */
export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("agent", { requestId, resource: "crm_setores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = await lerJson(req);
  const parsed = setorSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_setores")
    .insert({
      organization_id: authz.org.orgId,
      nome: parsed.data.nome,
      cor: parsed.data.cor,
      criado_por: authz.user.id,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505")
      return fail("conflict", t("Já existe um setor com esse nome."), 409, { requestId });
    if (error.code === "42501")
      return fail("forbidden", t("Você não pode editar setores."), 403, { requestId });
    return fail("internal_error", error.message, 500, { requestId });
  }
  const id = (data as { id: string }).id;
  try {
    await trocarMembros(supabase, authz.org.orgId, id, parsed.data.membros);
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
  void audit({
    action: "crm_setor.created",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_setor",
    resourceId: id,
    requestId,
    metadata: { nome: parsed.data.nome, membros: parsed.data.membros.length },
  });
  return ok({ id }, { requestId, status: 201 });
}
