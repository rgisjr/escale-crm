import type { createClient } from "@/lib/supabase/server";
import { buscaEmLotes } from "@/lib/supabase/em-lotes";
import type { Lead } from "@/lib/types/leads";

import { anexarDadosDosFiltros, type LinhasDosFiltros } from "./dados-do-quadro";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * A ETAPA DO FORK NA ROTA DO QUADRO (Fase 1D). Lê o que os filtros novos e a
 * ordenação precisam e o payload não trazia:
 *
 * - quantas atividades concluídas, pela função `fn_escale_atividades_concluidas`,
 *   que CONTA no banco (trazer as linhas bateria no corte de 1000 do PostgREST);
 * - o nome do contato;
 * - se o contato tem foto (Casca V4);
 * - status, canal, atendente e a última mensagem de cada lado da conversa da capa.
 *
 * Tudo com a sessão de quem olha (a RLS vale) e filtrado pela organização do
 * funil, que a rota já leu sob RLS. Erro sobe como nas outras etapas da rota: um
 * quadro que perde o dado em silêncio filtraria errado sem aviso.
 */
export async function comDadosDosFiltros(
  supabase: Supabase,
  orgId: string,
  leads: Lead[],
): Promise<{ leads: Lead[]; error: string | null }> {
  if (leads.length === 0) return { leads, error: null };
  const contatos = [...new Set(leads.map((l) => l.contact_id).filter((c): c is string => !!c))];
  const [concluidas, pessoas, conversas] = await Promise.all([
    buscaEmLotes(
      leads.map((l) => l.id),
      (lote) => supabase.rpc("fn_escale_atividades_concluidas", { p_org: orgId, p_leads: lote }),
    ),
    buscaEmLotes(contatos, (lote) =>
      supabase.from("contacts").select("id, name, display_name, is_anonymized, avatar_storage_path").eq("organization_id", orgId).in("id", lote),
    ),
    buscaEmLotes(contatos, (lote) =>
      supabase
        .from("conversations")
        .select("contact_id, status, channel, assigned_to_user_id, last_inbound_at, last_outbound_at, last_message_at")
        .eq("organization_id", orgId)
        .in("contact_id", lote)
        .order("last_message_at", { ascending: false, nullsFirst: false }),
    ),
  ]);
  const erro = concluidas.error ?? pessoas.error ?? conversas.error;
  if (erro) return { leads, error: erro.message };
  return {
    leads: anexarDadosDosFiltros(leads, {
      concluidas: concluidas.data as LinhasDosFiltros["concluidas"],
      contatos: pessoas.data as LinhasDosFiltros["contatos"],
      conversas: conversas.data as LinhasDosFiltros["conversas"],
    }),
    error: null,
  };
}
