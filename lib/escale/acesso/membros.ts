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

/**
 * A lista que vai para o `settings` (origem ou grupo): minúscula, sem repetição; `null` apaga a chave.
 * Quem já estava na lista gravada e deixou de ser membro (acesso revogado) sai em silêncio: a tela
 * não o mostra, então recusar travaria todo salvar. Um id NOVO fora da equipe continua sendo 422.
 */
export function listaParaGravar(
  pessoas: readonly string[],
  membros: readonly string[],
  gravadas: readonly string[] = [],
): { ok: true; lista: string[] | null } | { ok: false; erro: string } {
  const pedidas = [...new Set(pessoas.map((p) => p.toLowerCase()))];
  if (pedidas.some((p) => !membros.includes(p) && !gravadas.includes(p)))
    return { ok: false, erro: "Este usuário não faz parte da equipe." };
  const lista = pedidas.filter((p) => membros.includes(p));
  return { ok: true, lista: lista.length > 0 ? lista : null };
}
