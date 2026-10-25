import type { SupabaseClient } from "@supabase/supabase-js";

import { COLUNAS_DA_LISTA_DE_CONVERSAS } from "@/app/api/v1/conversations/_handler";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";

import type { FiltroDaFilaCompilado } from "./compilar-filtros-da-fila";
import type { Ordem } from "./ordem";

/**
 * A LEITURA DA FILA DA CASCA (fork Escale, Fase 3D; N9). `fn_escale_fila_da_casca`
 * (invoker, 9204) filtra, ordena e corta; o `.select()` sobre o rpc faz o embed
 * do contato e do canal com as MESMAS colunas da lista do original; a ordem se
 * repete no builder porque o embed não promete manter a da função.
 */
export const LIMITE_DA_PAGINA_MAX = 100;
export interface CursorDaFila {
  sort: string | null;
  id: string;
}

export const codificarCursor = (c: CursorDaFila): string =>
  Buffer.from(JSON.stringify(c), "utf8").toString("base64url");

export function decodificarCursor(texto: string | null | undefined): CursorDaFila | null {
  if (!texto) return null;
  try {
    const lido = JSON.parse(
      Buffer.from(texto, "base64url").toString("utf8"),
    ) as Partial<CursorDaFila>;
    if (typeof lido.id !== "string") return null;
    return { sort: typeof lido.sort === "string" ? lido.sort : null, id: lido.id };
  } catch {
    return null;
  }
}

const COLUNA_DA_ORDEM: Record<Ordem, "last_message_at" | "awaiting_since"> = {
  interacao: "last_message_at",
  espera: "awaiting_since",
};

export async function lerPaginaDaFila(
  supabase: SupabaseClient,
  orgId: string,
  compilado: FiltroDaFilaCompilado,
  ordem: Ordem,
  cursor: CursorDaFila | null,
  limite: number,
): Promise<{ conversas: ConversationWithContact[]; cursor: string | null; has_more: boolean }> {
  const asc = ordem === "espera";
  const coluna = COLUNA_DA_ORDEM[ordem];
  const { data, error } = await supabase
    .rpc("fn_escale_fila_da_casca", {
      p_org: orgId,
      p_filtros: compilado,
      p_ordem: ordem,
      p_depois_sort: cursor?.sort ?? null,
      p_depois_id: cursor?.id ?? null,
      p_depois_nulo: cursor ? cursor.sort === null : false,
      p_limite: limite + 1,
    })
    .select(COLUNAS_DA_LISTA_DE_CONVERSAS)
    .order(coluna, { ascending: asc, nullsFirst: false })
    .order("id", { ascending: asc });
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as unknown as ConversationWithContact[];
  const has_more = linhas.length > limite;
  const pagina = has_more ? linhas.slice(0, limite) : linhas;
  const ultima = pagina[pagina.length - 1] as
    (ConversationWithContact & Record<string, unknown>) | undefined;
  return {
    conversas: pagina,
    cursor:
      has_more && ultima
        ? codificarCursor({ sort: (ultima[coluna] as string | null) ?? null, id: ultima.id })
        : null,
    has_more,
  };
}

export async function contarFila(
  supabase: SupabaseClient,
  orgId: string,
  compilado: FiltroDaFilaCompilado,
): Promise<number> {
  const { data, error } = await supabase.rpc("fn_escale_contar_fila_da_casca", {
    p_org: orgId,
    p_filtros: compilado,
  });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

/** A organização tem alguma conversa de grupo visível na fila? (`EXISTS` do banco, sem contar; Q7c.) */
export async function filaTemGrupos(supabase: SupabaseClient, orgId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("fn_escale_fila_tem_grupos", { p_org: orgId });
  if (error) throw new Error(error.message);
  return data === true;
}
