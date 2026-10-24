import type { SupabaseClient } from "@supabase/supabase-js";

import { aceitaMensagemLivre } from "@/lib/channels/selectable";

import { modeloDaCampanha } from "./modelo";

/**
 * O CUSTO PREPARADO (fork Escale, Fase 8B; N15; resposta 4): cada envio guarda
 * o tipo do número e a categoria do modelo, para a conta vir depois sem refazer
 * o histórico. Nunca lança: roda DEPOIS do envio, e uma falha aqui não pode
 * marcar como falho quem já recebeu.
 */
export async function custoPreparado(
  admin: SupabaseClient,
  campanha: { organization_id: string; escale_mensagem?: unknown },
  sessionId: string,
): Promise<{ escale_numero_oficial: boolean | null; escale_categoria_do_modelo: string | null }> {
  try {
    const { data, error } = await admin
      .from("channel_sessions")
      .select("provider")
      .eq("organization_id", campanha.organization_id)
      .eq("id", sessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const provider = (data as { provider: string | null } | null)?.provider ?? null;
    return {
      escale_numero_oficial: data ? !aceitaMensagemLivre(provider) : null,
      escale_categoria_do_modelo: modeloDaCampanha(campanha.escale_mensagem)?.categoria ?? null,
    };
  } catch {
    return { escale_numero_oficial: null, escale_categoria_do_modelo: null };
  }
}
