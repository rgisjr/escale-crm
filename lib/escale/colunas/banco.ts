import type { SupabaseClient } from "@supabase/supabase-js";

import { type ItemDeColuna, lerColunas } from "@/lib/escale/contatos/regras";

/** As listas da casca que têm "Personalizar colunas" (fork Escale, 9101). Empresas chega na 2D. */
export const LISTAS_COM_COLUNAS = ["contatos", "empresas"] as const;
export type ListaComColunas = (typeof LISTAS_COM_COLUNAS)[number];

type ErroDoBanco = { code?: string; message?: string };

export async function lerColunasDaPessoa(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  lista: ListaComColunas,
): Promise<ItemDeColuna[]> {
  const { data, error } = await supabase
    .from("crm_colunas_das_listas")
    .select("colunas")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .eq("lista", lista)
    .maybeSingle();
  if (error) throw error;
  return lerColunas((data as { colunas?: unknown } | null)?.colunas ?? null);
}

/** Lê antes e atualiza ou insere; o índice único barra duas abas ao mesmo tempo (23505). */
export async function gravarColunasDaPessoa(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  lista: ListaComColunas,
  itens: ItemDeColuna[],
): Promise<{ error: ErroDoBanco | null }> {
  const colunas = { itens };
  const { data, error } = await supabase
    .from("crm_colunas_das_listas")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .eq("lista", lista)
    .maybeSingle();
  if (error) return { error };
  if (data) {
    const r = await supabase
      .from("crm_colunas_das_listas")
      .update({ colunas })
      .eq("id", (data as { id: string }).id);
    return { error: r.error };
  }
  const r = await supabase
    .from("crm_colunas_das_listas")
    .insert({ organization_id: orgId, user_id: userId, lista, colunas });
  return { error: r.error };
}
