import { type NextRequest } from "next/server";
import { requireSupportWrite } from "@/lib/impersonate/support";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { pode, setorEfetivo } from "@/lib/escale/conversas/setores-banco";
import type { Conversation } from "@/lib/types/messaging";

import { comAConversa } from "../_comum";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/**
 * "Sem atendente" no atendimento de OUTRA pessoa (N8; pendência da 3B N10).
 * O próprio atendimento continua pela rota do original. A mesma RPC do
 * release, com o atendente atual como o esperado (409 se mudou no meio).
 */
export async function POST(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  return comAConversa(ctx.params, async ({ authz, supabase, conversa, requestId, t }) => {
    const atual = conversa.assigned_to_user_id;
    if (!atual)
      return fail("state_conflict", t("A conversa já está sem atendente."), 409, { requestId });
    let autorizado = await pode(supabase, authz.org.orgId, "CHAT_CHANGE_ATTENDANT_ALL");
    if (!autorizado && (await pode(supabase, authz.org.orgId, "CHAT_CHANGE_ATTENDANT_TEAM"))) {
      const { setorId } = await setorEfetivo(supabase, authz.org.orgId, conversa);
      if (setorId) {
        const { data } = await supabase
          .from("crm_setores_membros")
          .select("user_id")
          .eq("organization_id", authz.org.orgId)
          .eq("setor_id", setorId)
          .eq("user_id", authz.user.id)
          .maybeSingle();
        autorizado = !!data;
      }
    }
    if (!autorizado)
      return fail(
        "forbidden",
        t("Só o atendente atual ou quem pode alterar atendentes libera a conversa."),
        403,
        { requestId },
      );
    const { data, error } = await supabase.rpc("fn_conversation_assign", {
      p_organization_id: authz.org.orgId,
      p_conversation_id: conversa.id,
      p_to_user_id: null as unknown as string,
      p_reason: "release",
      p_expected_assignee: atual,
      p_enforce_expected: true,
    });
    if (error) return fail("internal_error", error.message, 500, { requestId });
    const linha = (data as unknown[] | null)?.[0];
    if (!linha)
      return fail("state_conflict", t("O atendente já foi alterado por outro usuário!"), 409, {
        requestId,
      });
    void audit({
      action: "conversation.released_by_other",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "conversation",
      resourceId: conversa.id,
      requestId,
      metadata: { de: atual },
    });
    return ok(linha as Conversation, { requestId });
  });
}
