import { type NextRequest } from "next/server";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { z } from "zod";

import { fail, noContent, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { setorEfetivo } from "@/lib/escale/conversas/setores-banco";
import { lerJson } from "@/lib/escale/origens/respostas";

import { comAConversa } from "../_comum";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
const corpoSchema = z.object({ setor_id: z.string().uuid() });

/**
 * "Alterar setor" (C3, N7): o setor novo entra em transferência, com o setor e
 * o atendente anteriores guardados para o "Cancelar transferência"; o
 * atendente sai (a mesma RPC do release do original). Quem é do setor novo
 * passa a ver (policy da 9203) e o primeiro que assumir conclui (gatilho).
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  return comAConversa(ctx.params, async ({ authz, supabase, conversa, requestId, t }) => {
    const lido = await lerJson(req);
    const parsed = corpoSchema.safeParse(lido.ok ? lido.json : null);
    if (!parsed.success) return fail("validation_failed", t("Setor inválido."), 422, { requestId });
    const destino = parsed.data.setor_id;
    const { data: existe } = await supabase
      .from("crm_setores")
      .select("id")
      .eq("organization_id", authz.org.orgId)
      .eq("id", destino)
      .maybeSingle();
    if (!existe) return fail("not_found", t("Setor não encontrado."), 404, { requestId });
    const atual = await setorEfetivo(supabase, authz.org.orgId, conversa);
    if (atual.setorId === destino)
      return fail("validation_failed", t("A conversa já está nesse setor."), 422, { requestId });

    const { error } = await supabase.from("crm_setor_da_conversa").upsert(
      {
        conversation_id: conversa.id,
        organization_id: authz.org.orgId,
        setor_id: destino,
        em_transferencia: true,
        setor_anterior_id: atual.setorId,
        atendente_anterior_id: conversa.assigned_to_user_id,
        transferido_por: authz.user.id,
        transferido_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "conversation_id" },
    );
    if (error) return fail("internal_error", error.message, 500, { requestId });
    if (conversa.assigned_to_user_id) {
      const solta = await supabase.rpc("fn_conversation_assign", {
        p_organization_id: authz.org.orgId,
        p_conversation_id: conversa.id,
        p_to_user_id: null as unknown as string,
        p_reason: "release",
        p_expected_assignee: conversa.assigned_to_user_id,
        p_enforce_expected: true,
      });
      if (solta.error) return fail("internal_error", solta.error.message, 500, { requestId });
    }
    void audit({
      action: "conversation.sector_transfer",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "conversation",
      resourceId: conversa.id,
      requestId,
      metadata: { de: atual.setorId, para: destino },
    });
    return ok({ setor_id: destino, em_transferencia: true }, { requestId });
  });
}

/** "Cancelar transferência": volta o setor anterior e o atendente anterior. */
export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  return comAConversa(ctx.params, async ({ authz, supabase, conversa, requestId, t }) => {
    const atual = await setorEfetivo(supabase, authz.org.orgId, conversa);
    const exp = atual.explicito;
    if (!exp?.em_transferencia)
      return fail("state_conflict", t("A conversa não está em transferência."), 409, { requestId });
    const { error } = await supabase
      .from("crm_setor_da_conversa")
      .update({
        setor_id: exp.setor_anterior_id,
        em_transferencia: false,
        setor_anterior_id: null,
        atendente_anterior_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", authz.org.orgId)
      .eq("conversation_id", conversa.id);
    if (error) return fail("internal_error", error.message, 500, { requestId });
    if (exp.atendente_anterior_id && !conversa.assigned_to_user_id) {
      const volta = await supabase.rpc("fn_conversation_assign", {
        p_organization_id: authz.org.orgId,
        p_conversation_id: conversa.id,
        p_to_user_id: exp.atendente_anterior_id,
        p_reason: "transfer",
        p_expected_assignee: null as unknown as string,
        p_enforce_expected: true,
      });
      if (volta.error) return fail("internal_error", volta.error.message, 500, { requestId });
    }
    void audit({
      action: "conversation.sector_transfer_canceled",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "conversation",
      resourceId: conversa.id,
      requestId,
    });
    return noContent(requestId);
  });
}
