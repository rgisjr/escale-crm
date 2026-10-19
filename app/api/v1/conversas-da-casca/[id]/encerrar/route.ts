import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { lerJson } from "@/lib/escale/origens/respostas";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Conversation } from "@/lib/types/messaging";

import { comAConversa, gravarEvento } from "../_comum";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
const corpoSchema = z.object({ expected_revision: z.number().int().positive().optional() });

/**
 * "Encerrar atendimento" (C2): o mesmo passo de `conversations/[id]/close`
 * (`fn_service_status` com a revisão, pelo service role depois da leitura
 * pela sessão) mais o evento que a thread da Clint mostra.
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, true, async ({ authz, supabase, conversa, requestId, t }) => {
    const lido = await lerJson(req);
    const parsed = corpoSchema.safeParse(lido.ok ? lido.json : {});
    if (!parsed.success)
      return fail("validation_failed", t("Revisão inválida."), 422, { requestId });
    const { data, error } = await createAdminClient().rpc("fn_service_status", {
      p_org: conversa.organization_id,
      p_conversation: conversa.id,
      p_status: "closed",
      p_expected: parsed.data.expected_revision ?? conversa.service_revision,
    });
    const conflito = error?.code === "PT409" || error?.code === "40001";
    if (error) {
      return fail(
        conflito ? "conflict" : "internal_error",
        conflito ? t("O atendimento mudou. Atualize e tente novamente.") : error.message,
        conflito ? 409 : 500,
        { requestId },
      );
    }
    await gravarEvento(supabase, authz.org.orgId, conversa.id, "encerrado", authz.user.id);
    void audit({
      action: "conversation.closed",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "conversation",
      resourceId: conversa.id,
      requestId,
    });
    return ok(data as unknown as Conversation, { requestId });
  });
}
