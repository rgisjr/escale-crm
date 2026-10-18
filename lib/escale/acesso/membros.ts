import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Os membros ATIVOS da organização (convite aceito e não revogado), lidos com
 * a sessão de quem pede: a policy de `user_organizations` (migration 0044)
 * deixa gerente ou acima ver todas as linhas, e é gerente quem grava as listas.
 */
export async function membrosAtivos(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ ok: true; ids: string[] } | { ok: false; causa: { message: string } }> {
  const { data, error } = await supabase
    .from("user_organizations")
    .select("user_id")
    .eq("organization_id", orgId)
    .not("accepted_at", "is", null)
    .is("revoked_at", null);
  if (error) return { ok: false, causa: { message: error.message } };
  return {
    ok: true,
    ids: (data ?? []).map((l) => String((l as { user_id: string }).user_id).toLowerCase()),
  };
}

/** A lista que vai para o `settings` (origem ou grupo): minúscula, sem repetição; `null` apaga a chave. */
export function listaParaGravar(
  pessoas: readonly string[],
  membros: readonly string[],
): { ok: true; lista: string[] | null } | { ok: false; erro: string } {
  const lista = [...new Set(pessoas.map((p) => p.toLowerCase()))];
  if (lista.some((p) => !membros.includes(p)))
    return { ok: false, erro: "Este usuário não faz parte da equipe." };
  return { ok: true, lista: lista.length > 0 ? lista : null };
}
