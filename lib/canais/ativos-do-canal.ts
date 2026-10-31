import type { SupabaseClient } from "@supabase/supabase-js";

interface LinhaDeAtivo {
  channel_session_id: string | null;
  chave: string;
  asset_id: string | null;
}

/** Chave → id do ativo, para `var:<chave>` nos passos: padrão da organização, sobrescrito pelo número. */
export async function lerAtivosDoCanal(
  admin: SupabaseClient,
  organizationId: string,
  channelSessionId: string | null,
): Promise<Record<string, string>> {
  let consulta = admin
    .from("channel_variables")
    .select("channel_session_id, chave, asset_id")
    .eq("organization_id", organizationId)
    .not("asset_id", "is", null);
  consulta =
    channelSessionId === null
      ? consulta.is("channel_session_id", null)
      : consulta.or(`channel_session_id.is.null,channel_session_id.eq.${channelSessionId}`);
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as LinhaDeAtivo[];
  const resultado: Record<string, string> = {};
  for (const l of linhas) if (l.channel_session_id === null && l.asset_id) resultado[l.chave] = l.asset_id;
  for (const l of linhas) if (l.channel_session_id !== null && l.asset_id) resultado[l.chave] = l.asset_id;
  return resultado;
}
