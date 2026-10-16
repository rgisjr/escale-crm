/**
 * A preferência do card no banco (fork Escale, Fase 1E; migration 9005) e o 500
 * genérico das rotas do quadro. `requireSupportWrite()`/`requireRole()` NÃO
 * moram aqui: o gate `suporte-cobertura-de-efeitos` exige a guarda no handler.
 */
import { fail } from "@/lib/api/wrappers";
import { logger } from "@/lib/logger";
import type { createClient } from "@/lib/supabase/server";

import { lerPrefs, type PrefsDoCard } from "./tipos";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type ErroDoBanco = { code?: string; message?: string };

/** A preferência da pessoa, ou `null`. LANÇA o erro do banco (com `code`). */
export async function lerPrefsDaPessoa(
  supabase: Supabase,
  orgId: string,
  userId: string,
): Promise<PrefsDoCard | null> {
  const { data, error } = await supabase
    .from("crm_capas_do_card")
    .select("capa")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? lerPrefs((data as { capa: unknown }).capa) : null;
}

/** Atualiza a linha da pessoa ou cria a primeira. */
export async function gravarPrefsDaPessoa(
  supabase: Supabase,
  orgId: string,
  userId: string,
  prefs: PrefsDoCard,
): Promise<{ error: ErroDoBanco | null }> {
  const { data: existente, error: erroDaLeitura } = await supabase
    .from("crm_capas_do_card")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (erroDaLeitura) return { error: erroDaLeitura };
  if (existente) {
    const { error } = await supabase
      .from("crm_capas_do_card")
      .update({ capa: prefs })
      .eq("id", (existente as { id: string }).id)
      .eq("organization_id", orgId);
    return { error };
  }
  const { error } = await supabase
    .from("crm_capas_do_card")
    .insert({ organization_id: orgId, user_id: userId, capa: prefs });
  return { error };
}

export interface OndeFalhou {
  rota: string;
  operacao: string;
}

/**
 * 500 para o que o banco devolveu e a gente não sabe nomear: o cliente recebe só
 * o texto genérico; a mensagem crua (tabela, constraint) fica no log, com o
 * requestId. É a regra da 1D (`falhaInesperada` dos filtros salvos).
 */
export function falhaInesperadaDoQuadro(
  erro: ErroDoBanco | null | undefined,
  onde: OndeFalhou,
  t: (texto: string) => string,
  requestId: string,
): Response {
  logger.error("[quadro] erro inesperado", {
    rota: onde.rota,
    operacao: onde.operacao,
    codigo: erro?.code ?? null,
    erro: erro?.message ?? String(erro),
    requestId,
  });
  return fail("internal_error", t("Não consegui completar essa ação. Tente de novo."), 500, {
    requestId,
  });
}
