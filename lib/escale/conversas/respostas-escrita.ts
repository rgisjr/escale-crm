/**
 * A escrita das respostas rápidas, extraída das rotas REST para que a rota e a ferramenta MCP chamem a
 * MESMA função. Quem escolhe o client (sessão ou service role) é o chamador: depende do papel e das
 * permissões de quem pede, e isso fica na rota. `organizationId` vem sempre de fonte confiável.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { falhaDeEscrita, type ResultadoDeEscrita } from "@/lib/api/resultado-de-escrita";
import { audit } from "@/lib/audit";
import { gravarExtras } from "@/lib/escale/conversas/respostas-banco";
import type { NovaResposta } from "@/lib/escale/conversas/respostas";

function mensagemDoBanco(err: unknown): string {
  return err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err);
}

export async function criarResposta(
  db: SupabaseClient,
  entrada: {
    organizationId: string;
    /** `null` = compartilhada (sem dono). */
    donoUserId: string | null;
    criadoPor: string | null;
    dados: NovaResposta;
    requestId: string;
  },
): Promise<ResultadoDeEscrita<{ id: string }>> {
  const { organizationId, dados } = entrada;
  const { data, error } = await db
    .from("message_templates")
    .insert({
      organization_id: organizationId,
      owner_user_id: entrada.donoUserId,
      title: dados.atalho,
      shortcut: dados.atalho,
      body: dados.corpo,
      created_by_user_id: entrada.criadoPor,
    })
    .select("id")
    .single();
  if (error) {
    return error.code === "42501"
      ? falhaDeEscrita("forbidden", error.message, 403)
      : falhaDeEscrita("internal_error", error.message, 500);
  }
  const id = (data as { id: string }).id;
  try {
    await gravarExtras(db, organizationId, id, dados);
  } catch (err) {
    return falhaDeEscrita("internal_error", mensagemDoBanco(err), 500);
  }
  void audit({
    action: "quick_reply.created",
    actorUserId: entrada.criadoPor,
    organizationId,
    resourceType: "message_template",
    resourceId: id,
    requestId: entrada.requestId,
    metadata: { compartilhada: dados.compartilhar, canais: dados.canais },
  });
  return { ok: true, dado: { id } };
}

export async function atualizarResposta(
  db: SupabaseClient,
  entrada: {
    organizationId: string;
    id: string;
    /** O dono que a linha passa a ter (`null` = compartilhada). */
    donoUserId: string | null;
    atualizadoPor: string | null;
    dados: NovaResposta;
    requestId: string;
  },
): Promise<ResultadoDeEscrita<{ id: string }>> {
  const { organizationId, id, dados } = entrada;
  const { error } = await db
    .from("message_templates")
    .update({
      title: dados.atalho,
      shortcut: dados.atalho,
      body: dados.corpo,
      owner_user_id: entrada.donoUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("id", id);
  if (error) return falhaDeEscrita("internal_error", error.message, 500);
  try {
    await gravarExtras(db, organizationId, id, dados);
  } catch (err) {
    return falhaDeEscrita("internal_error", mensagemDoBanco(err), 500);
  }
  void audit({
    action: "quick_reply.updated",
    actorUserId: entrada.atualizadoPor,
    organizationId,
    resourceType: "message_template",
    resourceId: id,
    requestId: entrada.requestId,
  });
  return { ok: true, dado: { id } };
}

export async function excluirResposta(
  db: SupabaseClient,
  entrada: { organizationId: string; id: string; excluidoPor: string | null; requestId: string },
): Promise<ResultadoDeEscrita<{ id: string }>> {
  const { error } = await db
    .from("message_templates")
    .delete()
    .eq("organization_id", entrada.organizationId)
    .eq("id", entrada.id);
  if (error) return falhaDeEscrita("internal_error", error.message, 500);
  void audit({
    action: "quick_reply.deleted",
    actorUserId: entrada.excluidoPor,
    organizationId: entrada.organizationId,
    resourceType: "message_template",
    resourceId: entrada.id,
    requestId: entrada.requestId,
  });
  return { ok: true, dado: { id: entrada.id } };
}
