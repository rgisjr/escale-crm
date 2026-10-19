import type { SupabaseClient } from "@supabase/supabase-js";

import { COLUNAS_NATIVAS, COLUNAS_PADRAO, type ItemDeColuna, lerColunas } from "@/lib/escale/contatos/regras";
import { COLUNAS_NATIVAS_DE_EMPRESAS, COLUNAS_PADRAO_DE_EMPRESAS } from "@/lib/escale/empresas/regras";

/** As listas da casca que têm "Personalizar colunas" (fork Escale, 9101; empresas na 2D). */
export const LISTAS_COM_COLUNAS = ["contatos", "empresas"] as const;
export type ListaComColunas = (typeof LISTAS_COM_COLUNAS)[number];

export const NATIVAS_POR_LISTA: Record<ListaComColunas, readonly string[]> = {
  contatos: COLUNAS_NATIVAS,
  empresas: COLUNAS_NATIVAS_DE_EMPRESAS,
};
export const PADRAO_POR_LISTA: Record<ListaComColunas, readonly ItemDeColuna[]> = {
  contatos: COLUNAS_PADRAO,
  empresas: COLUNAS_PADRAO_DE_EMPRESAS,
};

/** As colunas gravadas, só com as nativas daquela lista e os campos válidos; estragadas, o padrão da lista. */
export function lerColunasDaLista(lista: ListaComColunas, bruto: unknown): ItemDeColuna[] {
  return lerColunas(bruto, { aceitarNativas: NATIVAS_POR_LISTA[lista], padrao: PADRAO_POR_LISTA[lista] });
}

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
  return lerColunasDaLista(lista, (data as { colunas?: unknown } | null)?.colunas ?? null);
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
