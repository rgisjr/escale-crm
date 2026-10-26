import type { SupabaseClient } from "@supabase/supabase-js";

import { carregarFontes } from "./fontes";
import type { FontesDasVariaveis } from "./resolver";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, any, any>;

/**
 * As fontes para quem escreve NA CONVERSA (resposta rápida, modelo da Meta;
 * Frente V). A conversa é lida com o cliente da sessão (`sb`), então a RLS
 * decide se a pessoa a enxerga: conversa fora do alcance = `null` (a rota
 * responde 404). O negócio é o aberto mais recente do contato; o "Usuário" é
 * quem envia (D3).
 */
export async function fontesDaConversa(
  sb: SB,
  admin: SB,
  orgId: string,
  conversationId: string,
  usuarioId: string,
  tokens: readonly string[],
): Promise<FontesDasVariaveis | null> {
  const conversa = await sb
    .from("conversations")
    .select("id, contact_id")
    .eq("organization_id", orgId)
    .eq("id", conversationId)
    .maybeSingle();
  if (conversa.error) throw conversa.error;
  if (!conversa.data) return null;
  const contactId = (conversa.data as { contact_id: string | null }).contact_id;

  let leadId: string | null = null;
  if (contactId && tokens.some((t) => t.startsWith("DEAL.") && !t.startsWith("DEAL.LATEST_MEETING"))) {
    const lead = await sb
      .from("crm_leads")
      .select("id")
      .eq("organization_id", orgId)
      .eq("contact_id", contactId)
      .eq("status", "open")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (lead.error) throw lead.error;
    leadId = ((lead.data ?? []) as Array<{ id: string }>)[0]?.id ?? null;
  }

  return carregarFontes(sb, admin, orgId, { contactId, leadId, usuarioId }, tokens);
}
