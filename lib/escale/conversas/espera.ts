import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";

/**
 * EM ESPERA SEM LEMBRETE (fork Escale, Fase 3B; C2, decisão 2 da seção 9).
 * O snooze do original com um fim que nunca chega e uma marca no `metadata`:
 * o `snooze-watcher` não reabre, a casca mostra "Em espera", e a mensagem nova
 * do cliente tira da espera (`tirarDaEsperaDaCasca`, encaixe do pós-entrada).
 */
export const ESPERA_SEM_FIM = "9999-12-31T00:00:00.000Z";
export const MARCA_DA_ESPERA = "escale_em_espera";

type Meta = Record<string, unknown> | null | undefined;

export function emEsperaDaCasca(
  c: { snooze_until: string | null; metadata?: Meta },
  agora: Date = new Date(),
): boolean {
  if (!c.metadata || c.metadata[MARCA_DA_ESPERA] !== true) return false;
  return !!c.snooze_until && Date.parse(c.snooze_until) > agora.getTime();
}

export function camposParaEntrarEmEspera(userId: string, agora: Date, metadata: Meta) {
  return {
    snooze_until: ESPERA_SEM_FIM,
    snoozed_at: agora.toISOString(),
    snoozed_by_user_id: userId,
    metadata: { ...(metadata ?? {}), [MARCA_DA_ESPERA]: true },
  };
}

export function camposParaSairDaEspera(metadata: Meta) {
  const { [MARCA_DA_ESPERA]: _marca, ...resto } = metadata ?? {};
  return { snooze_until: null, snoozed_at: null, snoozed_by_user_id: null, metadata: resto };
}

/** O encaixe do pós-entrada: a mensagem nova do cliente tira a conversa da espera. Nunca derruba a entrada. */
export async function tirarDaEsperaDaCasca(
  admin: SupabaseClient,
  organizationId: string,
  conversationId: string,
): Promise<void> {
  try {
    const { data } = await admin
      .from("conversations")
      .select("id, snooze_until, metadata")
      .eq("organization_id", organizationId)
      .eq("id", conversationId)
      .maybeSingle();
    const c = data as { id: string; snooze_until: string | null; metadata: Meta } | null;
    if (!c || !emEsperaDaCasca(c)) return;
    const { error } = await admin
      .from("conversations")
      .update(camposParaSairDaEspera(c.metadata))
      .eq("organization_id", organizationId)
      .eq("id", conversationId);
    if (error) throw error;
    await admin.from("crm_eventos_da_conversa").insert({
      organization_id: organizationId,
      conversation_id: conversationId,
      tipo: "espera_removida",
      user_id: null,
    });
  } catch (err) {
    logger.warn("escale/espera: não consegui tirar da espera", {
      organization_id: organizationId,
      conversation_id: conversationId,
      detail: err instanceof Error ? err.message.slice(0, 160) : "desconhecido",
    });
  }
}
