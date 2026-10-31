import type { SupabaseClient } from "@supabase/supabase-js";

import { canalDaConversaOuDoContato } from "@/lib/canais/canal-da-conversa";
import { contextoDoCanal } from "@/lib/canais/variaveis";

/**
 * Devolve uma cópia do contexto de render com `canal` e `atendente` do número da
 * conversa. Sem conversa nem contato com conversa, o contexto volta como veio.
 * O atendente é o responsável do canal; com vários ou nenhum, o dono do negócio.
 */
export async function anexarCanalAoContexto(
  admin: SupabaseClient,
  organizationId: string,
  contexto: Record<string, unknown>,
  conversationId: string | null,
  contactId: string,
): Promise<Record<string, unknown>> {
  const canalId = await canalDaConversaOuDoContato(admin, organizationId, { conversationId, contactId });
  if (canalId === null) return contexto;
  const dono = (contexto.lead as { owner_user_id?: string | null } | undefined)?.owner_user_id ?? null;
  const { canal, atendente } = await contextoDoCanal(admin, organizationId, canalId, dono);
  return { ...contexto, canal, atendente };
}
