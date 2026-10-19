import { type NextRequest } from "next/server";

import { ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";

import { comAConversa } from "../_comum";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** "Marcar como não lida" (C1): a bolha volta à linha. Pela sessão (policy de update do agente). */
export async function POST(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, true, async ({ authz, supabase, conversa, requestId }) => {
    const { error } = await supabase
      .from("conversations")
      .update({ unread_count_for_assignee: 1 })
      .eq("organization_id", authz.org.orgId)
      .eq("id", conversa.id);
    if (error) throw error;
    void audit({
      action: "conversation.marked_unread",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "conversation",
      resourceId: conversa.id,
      requestId,
    });
    return ok({ unread_count_for_assignee: 1 }, { requestId });
  });
}
