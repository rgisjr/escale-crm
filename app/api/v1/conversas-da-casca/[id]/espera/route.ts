import { type NextRequest } from "next/server";

import { noContent, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { camposParaEntrarEmEspera, camposParaSairDaEspera } from "@/lib/escale/conversas/espera";

import { comAConversa, gravarEvento } from "../_comum";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** "Colocar em espera" (C2; decisão 2): o snooze do original sem fim, com a marca "sem lembrete". */
export async function POST(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, true, async ({ authz, supabase, conversa, requestId }) => {
    const campos = camposParaEntrarEmEspera(authz.user.id, new Date(), conversa.metadata);
    const { error } = await supabase
      .from("conversations")
      .update(campos)
      .eq("organization_id", authz.org.orgId)
      .eq("id", conversa.id);
    if (error) throw error;
    await gravarEvento(supabase, authz.org.orgId, conversa.id, "espera", authz.user.id);
    void audit({
      action: "conversation.waiting_set",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "conversation",
      resourceId: conversa.id,
      requestId,
    });
    return ok({ snooze_until: campos.snooze_until }, { requestId });
  });
}

/** "Remover espera". */
export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, true, async ({ authz, supabase, conversa, requestId }) => {
    const { error } = await supabase
      .from("conversations")
      .update(camposParaSairDaEspera(conversa.metadata))
      .eq("organization_id", authz.org.orgId)
      .eq("id", conversa.id);
    if (error) throw error;
    await gravarEvento(supabase, authz.org.orgId, conversa.id, "espera_removida", authz.user.id);
    void audit({
      action: "conversation.waiting_cleared",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "conversation",
      resourceId: conversa.id,
      requestId,
    });
    return noContent(requestId);
  });
}
