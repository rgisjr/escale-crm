import { type NextRequest } from "next/server";

import { patchConversationHandler } from "@/app/api/v1/conversations/_handler";
import { ApiError } from "@/lib/api/types";
import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";

import { comAConversa, gravarEvento } from "../_comum";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** "Reabrir atendimento" (C2): o `PATCH status=open` do original, mais o evento. */
export async function POST(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, true, async ({ authz, supabase, conversa, requestId }) => {
    try {
      const reaberta = await patchConversationHandler(
        supabase,
        {
          organization_id: authz.org.orgId,
          actor: { type: "user", id: authz.user.id, role: authz.org.role },
          requestId,
          idioma: authz.user.idioma,
        },
        conversa.id,
        { status: "open" },
      );
      await gravarEvento(supabase, authz.org.orgId, conversa.id, "reaberto", authz.user.id);
      void audit({
        action: "conversation.reopened",
        actorUserId: authz.user.id,
        organizationId: authz.org.orgId,
        resourceType: "conversation",
        resourceId: conversa.id,
        requestId,
      });
      return ok(reaberta, { requestId });
    } catch (err) {
      if (err instanceof ApiError) return fail(err.code, err.message, err.status, { requestId });
      throw err;
    }
  });
}
