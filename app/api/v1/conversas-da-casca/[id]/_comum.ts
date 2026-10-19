import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { fail } from "@/lib/api/wrappers";
import { requireRole, type RoleCheck } from "@/lib/auth/require-role";
import type { TipoDeEvento } from "@/lib/escale/conversas/eventos";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export interface ConversaVisivel {
  id: string;
  organization_id: string;
  status: string;
  service_revision: number;
  assigned_to_user_id: string | null;
  snooze_until: string | null;
  metadata: Record<string, unknown> | null;
  bot_silenced_until: string | null;
  contact_id: string | null;
  last_inbound_at: string | null;
}

export const COLUNAS_DA_CONVERSA =
  "id, organization_id, status, service_revision, assigned_to_user_id, snooze_until, metadata, bot_silenced_until, contact_id, last_inbound_at";

/** Pela SESSÃO: a policy `conversations_select` (visibility_mode) decide o que a pessoa vê. */
export async function lerConversaVisivel(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
): Promise<ConversaVisivel | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select(COLUNAS_DA_CONVERSA)
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ConversaVisivel | null) ?? null;
}

export async function gravarEvento(
  supabase: SupabaseClient,
  orgId: string,
  conversationId: string,
  tipo: Exclude<TipoDeEvento, "atendente">,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("crm_eventos_da_conversa")
    .insert({ organization_id: orgId, conversation_id: conversationId, tipo, user_id: userId });
  if (error) throw error;
}

type Ok = Extract<RoleCheck, { ok: true }>;

/**
 * O esqueleto de toda rota da conversa na casca: agente ou acima, id válido, a conversa visível pela
 * sessão (404 se não), e o `t` do idioma de quem pede.
 */
export async function comAConversa(
  params: Promise<{ id: string }>,
  corpo: (e: {
    authz: Ok;
    supabase: SupabaseClient;
    conversa: ConversaVisivel;
    requestId: string;
    t: (texto: string) => string;
  }) => Promise<Response>,
): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const id = lerUuid((await params).id);
  if (!id) return fail("not_found", t("Conversa não encontrada."), 404, { requestId });
  const supabase = await createClient();
  try {
    const conversa = await lerConversaVisivel(supabase, authz.org.orgId, id);
    if (!conversa) return fail("not_found", t("Conversa não encontrada."), 404, { requestId });
    return await corpo({ authz, supabase, conversa, requestId, t });
  } catch (err) {
    const e = err as { message?: string };
    return fail("internal_error", e.message ?? "erro", 500, { requestId });
  }
}
