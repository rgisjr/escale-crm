import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * O número (canal) pelo qual a conversa acontece. A conversa informada manda; sem
 * ela (ou se ela não existe nesta organização), vale a conversa individual mais
 * recente do contato. `null` = não há conversa para tirar o canal.
 */
export async function canalDaConversaOuDoContato(
  admin: SupabaseClient,
  organizationId: string,
  alvo: { conversationId?: string | null; contactId?: string | null },
): Promise<string | null> {
  if (alvo.conversationId) {
    const { data, error } = await admin
      .from("conversations")
      .select("channel_session_id")
      .eq("organization_id", organizationId)
      .eq("id", alvo.conversationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const canal = (data as { channel_session_id?: string | null } | null)?.channel_session_id;
    if (canal) return canal;
  }
  if (!alvo.contactId) return null;
  const { data, error } = await admin
    .from("conversations")
    .select("channel_session_id")
    .eq("organization_id", organizationId)
    .eq("contact_id", alvo.contactId)
    .eq("is_group", false)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { channel_session_id?: string | null } | null)?.channel_session_id ?? null;
}
