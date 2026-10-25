import type { createClient } from "@/lib/supabase/server";
import { buscaEmLotes } from "@/lib/supabase/em-lotes";
import type { Lead } from "@/lib/types/leads";

import { anexarDadosDosFiltros, type LinhasDosFiltros } from "./dados-do-quadro";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** As colunas de `contacts` que as etapas do quadro leem (filtros, marcadores e dados do card), numa leitura só. */
const COLUNAS_DO_CONTATO =
  "id, name, display_name, is_anonymized, avatar_storage_path, tags, phone_number, email, custom_fields";
/** As colunas de `conversations` que as etapas do quadro leem (capa, marcadores e filtros), numa leitura só. */
const COLUNAS_DA_CONVERSA =
  "id, contact_id, last_message_preview, last_message_at, unread_count_for_assignee, tags, status, channel, assigned_to_user_id, last_inbound_at, last_outbound_at";

export type ContatoDoQuadro = LinhasDosFiltros["contatos"][number] & {
  tags: string[] | null;
  phone_number: string | null;
  email: string | null;
  custom_fields: Record<string, unknown> | null;
};
export type ConversaDoQuadro = LinhasDosFiltros["conversas"][number] & {
  id: string;
  last_message_preview: string | null;
  unread_count_for_assignee: number | null;
  tags: string[] | null;
};
export interface ContatosEConversasDoQuadro {
  contatos: ContatoDoQuadro[];
  conversas: ConversaDoQuadro[];
}

/**
 * UMA leitura de `contacts` e UMA de `conversations` para o quadro inteiro (Q2b,
 * G2-2): antes cada etapa (`comDadosDosFiltros`, a capa da conversa e os
 * marcadores do contato) lia as duas tabelas de novo para os mesmos contatos. As
 * conversas vêm da mais recente para a mais antiga: quem precisa de "a primeira
 * de cada contato" lê nessa ordem. Sessão de quem olha (a RLS vale) e filtro por
 * organização, como as etapas.
 */
export async function lerContatosEConversas(
  supabase: Supabase,
  orgId: string,
  leads: Lead[],
): Promise<{ linhas: ContatosEConversasDoQuadro; error: string | null }> {
  const contatos = [...new Set(leads.map((l) => l.contact_id).filter((c): c is string => !!c))];
  const [pessoas, conversas] = await Promise.all([
    buscaEmLotes(contatos, (lote) =>
      supabase.from("contacts").select(COLUNAS_DO_CONTATO).eq("organization_id", orgId).in("id", lote),
    ),
    buscaEmLotes(contatos, (lote) =>
      supabase
        .from("conversations")
        .select(COLUNAS_DA_CONVERSA)
        .eq("organization_id", orgId)
        .in("contact_id", lote)
        .order("last_message_at", { ascending: false, nullsFirst: false }),
    ),
  ]);
  const erro = pessoas.error ?? conversas.error;
  return {
    linhas: {
      contatos: pessoas.data as unknown as ContatoDoQuadro[],
      conversas: conversas.data as unknown as ConversaDoQuadro[],
    },
    error: erro?.message ?? null,
  };
}

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
 *
 * `lidas` (Q2b): contatos e conversas que a rota já leu para o quadro inteiro
 * (`lerContatosEConversas`); com elas só a contagem de atividades vai ao banco.
 */
export async function comDadosDosFiltros(
  supabase: Supabase,
  orgId: string,
  leads: Lead[],
  lidas?: Pick<LinhasDosFiltros, "contatos" | "conversas">,
): Promise<{ leads: Lead[]; error: string | null }> {
  if (leads.length === 0) return { leads, error: null };
  const contatos = [...new Set(leads.map((l) => l.contact_id).filter((c): c is string => !!c))];
  const [concluidas, pessoas, conversas] = await Promise.all([
    buscaEmLotes(
      leads.map((l) => l.id),
      (lote) => supabase.rpc("fn_escale_atividades_concluidas", { p_org: orgId, p_leads: lote }),
    ),
    lidas
      ? Promise.resolve({ data: lidas.contatos, error: null })
      : buscaEmLotes(contatos, (lote) =>
          supabase
            .from("contacts")
            .select("id, name, display_name, is_anonymized, avatar_storage_path")
            .eq("organization_id", orgId)
            .in("id", lote),
        ),
    lidas
      ? Promise.resolve({ data: lidas.conversas, error: null })
      : buscaEmLotes(contatos, (lote) =>
          supabase
            .from("conversations")
            .select(
              "contact_id, status, channel, assigned_to_user_id, last_inbound_at, last_outbound_at, last_message_at",
            )
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
