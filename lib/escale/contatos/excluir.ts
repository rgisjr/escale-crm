import type { SupabaseClient } from "@supabase/supabase-js";

import { deleteContactHandler, vinculosDoContatoHandler } from "@/app/api/v1/contacts/_handler";
import type { HandlerCtx } from "@/lib/api/handlers/types";
import { ApiError } from "@/lib/api/types";
import { audit } from "@/lib/audit";
import { traduzir } from "@/lib/i18n/dicionario";

/**
 * EXCLUIR O CONTATO COM OS NEGÓCIOS (fork Escale, Fase 2B; Q5 de 17/10: "Os negócios
 * associados aos contatos serão excluídos", como a Clint). Vale para a exclusão em
 * massa (consumidor, service role) e para o ⋮ da linha (rota do fork, sessão).
 *
 * 1. A trava da Agenda do original vem ANTES de tudo (`vinculosDoContatoHandler`):
 *    contato com compromisso não sai, e nenhum negócio é apagado.
 * 2. TODOS os negócios do contato na organização (não só os da tela) saem pelo mesmo
 *    caminho do "excluir em lote" do original (`app/api/v1/leads/bulk`): DELETE em
 *    `crm_leads`, o evento `lead.bulk_deleted` e a auditoria `lead.bulk_action`.
 *    Gerente e admin enxergam e apagam todos pela RLS (`fn_can_view_lead`).
 * 3. O contato sai pelo `deleteContactHandler` do original (conversas e mensagens
 *    numa transação, `contact.deleted`, auditoria). Se ele falhar depois do passo 2,
 *    os negócios já saíram: a falha vira "falha com motivo" na ação, como hoje.
 */
export async function excluirContatoComNegocios(
  db: SupabaseClient,
  ctx: HandlerCtx,
  contactId: string,
): Promise<{ id: string; negocios: number }> {
  const { vinculos, por_tabela } = await vinculosDoContatoHandler(db, ctx, contactId);
  if (vinculos.length > 0) {
    throw new ApiError(
      409,
      "state_conflict",
      { vinculos, por_tabela },
      ctx.requestId,
      traduzir(
        "Não foi possível excluir: o contato ainda tem registros vinculados.",
        ctx.idioma ?? "pt-BR",
      ),
    );
  }

  const { data, error } = await db
    .from("crm_leads")
    .delete()
    .eq("organization_id", ctx.organization_id)
    .eq("contact_id", contactId)
    .select("id");
  if (error) throw new ApiError(500, "internal_error", undefined, ctx.requestId, error.message);
  const ids = ((data ?? []) as Array<{ id: string }>).map((l) => l.id);

  if (ids.length > 0) {
    const ator = ctx.actor.type === "user" ? ctx.actor.id : null;
    // O mesmo evento e a mesma auditoria agregados do "excluir em lote" do original.
    await db
      .rpc("emit_event", {
        p_event_type: "lead.bulk_deleted",
        p_entity_kind: "crm_lead",
        p_entity_id: null,
        p_payload: { action: "delete", lead_ids: ids, params: {} },
        p_metadata: { request_id: ctx.requestId, actor_user_id: ator, origem: "excluir_contato" },
        p_organization_id: ctx.organization_id,
      })
      .then(({ error: falhou }) => {
        if (falhou) console.error("[contatos.excluir] emit_event failed", falhou.message);
      });
    await audit({
      action: "lead.bulk_action",
      actorUserId: ator,
      organizationId: ctx.organization_id,
      resourceType: "crm_lead",
      resourceId: null,
      requestId: ctx.requestId,
      metadata: {
        action: "delete",
        lead_ids: ids,
        count: ids.length,
        updated_count: ids.length,
        params: {},
        origem: "excluir_contato",
        contact_id: contactId,
      },
    });
  }

  await deleteContactHandler(db, ctx, contactId);
  return { id: contactId, negocios: ids.length };
}
