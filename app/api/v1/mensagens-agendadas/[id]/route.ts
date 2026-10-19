import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, noContent } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** "Remover agendamento" (c62): `status = 'removida'` pela sessão; a RLS decide quem pode (a sua, agente; qualquer, gerente+). */
export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("agent", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const id = lerUuid((await ctx.params).id);
  if (!id) return fail("not_found", t("Agendamento não encontrado."), 404, { requestId });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_mensagens_agendadas")
    .update({ status: "removida" })
    .eq("organization_id", authz.org.orgId)
    .eq("id", id)
    .eq("status", "pendente")
    .select("id, conversation_id")
    .maybeSingle();
  if (error) return fail("internal_error", error.message, 500, { requestId });
  if (!data) return fail("not_found", t("Agendamento não encontrado."), 404, { requestId });
  void audit({
    action: "conversation_message.unscheduled",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "conversation",
    resourceId: (data as { conversation_id: string }).conversation_id,
    requestId,
    metadata: { agendamento: id },
  });
  return noContent(requestId);
}
