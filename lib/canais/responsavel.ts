import type { SupabaseClient } from "@supabase/supabase-js";

export type ResponsavelDoCanal =
  | { tipo: "unico"; userId: string }
  | { tipo: "varios"; userIds: string[] }
  | { tipo: "nenhum" };

/** Quem responde por este número, segundo Configurações › Atendimento (`channel_routing_*`). */
export async function responsavelDoCanal(
  admin: SupabaseClient,
  organizationId: string,
  channelSessionId: string,
): Promise<ResponsavelDoCanal> {
  const { data: politica, error: erroPolitica } = await admin
    .from("channel_routing_policies")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("channel_session_id", channelSessionId)
    .maybeSingle();
  if (erroPolitica) throw new Error(erroPolitica.message);
  if (!politica) return { tipo: "nenhum" };
  const { data, error } = await admin
    .from("channel_routing_responsibles")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("policy_id", (politica as { id: string }).id);
  if (error) throw new Error(error.message);
  const ids = ((data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);
  if (ids.length === 0) return { tipo: "nenhum" };
  return ids.length === 1 ? { tipo: "unico", userId: ids[0]! } : { tipo: "varios", userIds: ids };
}
