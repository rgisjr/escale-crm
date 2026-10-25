/**
 * O que a rota do quadro e a rota leve da ficha anexam ao(s) negócio(s): dono IA,
 * tarefas em aberto, conversa mais recente e dados/marcadores do contato.
 *
 * Mora aqui para as duas rotas enriquecerem pela MESMA régua (a ficha por link não
 * pode mostrar um negócio diferente do que o quadro mostra). Funções puras sobre
 * leads já lidos; o que muda entre as rotas é só QUANTOS negócios entram.
 */
import { anexarDadosDoContato } from "@/lib/kanban/dados-do-contato";
import { anexarTarefasAosNegocios, type LinhaDaTarefaNoQuadro } from "@/lib/kanban/tarefas-no-quadro";
import type { ContatoDoQuadro, ConversaDoQuadro } from "@/lib/escale/filtros/ler-dados-do-quadro";
import { buscaEmLotes } from "@/lib/supabase/em-lotes";
import type { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/types/leads";

/**
 * Anexa a identidade do agente dono (nome + versão publicada) aos leads que têm
 * `owner_kind='ai'`.
 *
 * **Sem filtro de `is_active`/`archived_at` de propósito.** Quem é o dono é
 * pergunta de EXIBIÇÃO e vale para qualquer agente: desativar um bot não pode
 * transformar os negócios dele em cards anônimos. A lista de agentes que PODEM
 * receber um lead (o picker, `/api/v1/ai/agents/assignable`) é outra pergunta e
 * lá os filtros estão certos.
 *
 * `organization_id` é filtrado explicitamente — vem do pipeline já validado pela
 * RLS do caller, nunca do body.
 */
export async function withOwnerAgents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  leads: Lead[],
): Promise<{ leads: Lead[]; error: string | null }> {
  const agentIds = [
    ...new Set(
      leads
        .filter((l) => l.owner_kind === "ai" && l.owner_agent_id)
        .map((l) => l.owner_agent_id as string),
    ),
  ];
  if (agentIds.length === 0) return { leads, error: null };

  const { data: agents, error: agentsErr } = await supabase
    .from("ai_agents")
    .select("id, name, published_version_id")
    .eq("organization_id", organizationId)
    .in("id", agentIds);
  if (agentsErr) return { leads, error: agentsErr.message };

  const agentRows = (agents ?? []) as Array<{
    id: string;
    name: string;
    published_version_id: string | null;
  }>;

  const publishedIds = agentRows
    .map((a) => a.published_version_id)
    .filter((v): v is string => !!v);
  const versionById = new Map<string, number>();
  if (publishedIds.length > 0) {
    const { data: versions, error: versionsErr } = await supabase
      .from("ai_agent_versions")
      .select("id, version_number")
      .eq("organization_id", organizationId)
      .in("id", publishedIds);
    if (versionsErr) return { leads, error: versionsErr.message };
    for (const v of (versions ?? []) as Array<{ id: string; version_number: number }>) {
      versionById.set(v.id, v.version_number);
    }
  }

  const byId = new Map(agentRows.map((a) => [a.id, a]));
  return {
    leads: leads.map((lead) => {
      if (lead.owner_kind !== "ai" || !lead.owner_agent_id) return lead;
      const agent = byId.get(lead.owner_agent_id);
      if (!agent) return lead;
      return {
        ...lead,
        owner_agent: {
          id: agent.id,
          name: agent.name,
          version_number: agent.published_version_id
            ? (versionById.get(agent.published_version_id) ?? null)
            : null,
        },
      };
    }),
    error: null,
  };
}

/**
 * Anexa a conversa mais recente do contato — o atalho do quadro para o inbox.
 *
 * LEFT, como o score: lead sem contato (criado à mão, vindo de webhook) e
 * contato sem conversa são estados normais, e sumir com esses cards do quadro
 * seria esconder justamente os que ninguém atendeu ainda.
 *
 * A MAIS RECENTE por contato, não todas: o card mostra uma linha, e escolher na
 * UI exigiria trazer o histórico inteiro de cada lead para descartar quase tudo.
 *
 * Ordena por `last_message_at` e fica com a primeira de cada contato — as
 * conversas já vêm ordenadas, então o primeiro visto é o mais recente.
 *
 * A MESMA consulta traz os marcadores de TODAS as conversas do contato
 * (`conversation_tags`, a terceira caixa — decisão do dono, doc 40, 19/09).
 * Aqui e não numa função própria porque ela já lê cada conversa do contato:
 * uma coluna a mais custa bytes; outra consulta com a mesma lista de ids na URL
 * custaria outra ida ao banco por quadro aberto.
 */
export function withConversas(leads: Lead[], conversas: ConversaDoQuadro[]): Lead[] {
  // As conversas vêm de `lerContatosEConversas` (uma leitura para o quadro todo), da mais
  // recente para a mais antiga; é a ordem DENTRO do contato que "a primeira vista vence" lê.
  const porContato = new Map<string, NonNullable<Lead["conversa"]>>();
  const marcadoresPorContato = new Map<string, Set<string>>();
  for (const row of conversas) {
    // Os marcadores somam TODAS as conversas; a linha do card é só a mais recente.
    for (const tag of row.tags ?? []) {
      const doContato = marcadoresPorContato.get(row.contact_id) ?? new Set<string>();
      doContato.add(tag);
      marcadoresPorContato.set(row.contact_id, doContato);
    }
    // Primeira vista vence: a consulta já veio ordenada por atividade.
    if (porContato.has(row.contact_id)) continue;
    porContato.set(row.contact_id, {
      id: row.id,
      preview: row.last_message_preview,
      last_message_at: row.last_message_at,
      unread: row.unread_count_for_assignee ?? 0,
    });
  }

  return leads.map((lead) => {
    if (!lead.contact_id) return lead;
    const conversa = porContato.get(lead.contact_id);
    const marcadores = marcadoresPorContato.get(lead.contact_id);
    return {
      ...lead,
      // `null`, nunca ausente: contato sem conversa é "não há conversa", e é
      // assim que o card e o dossiê sabem mostrar "Abrir conversa" (#1993).
      // Ausente (`undefined`) fica para o lead SEM contato, que sai acima.
      conversa: conversa ?? null,
      // Vazio não vira campo, como `contact_tags`: o payload não engorda.
      ...(marcadores && marcadores.size > 0 ? { conversation_tags: [...marcadores] } : {}),
    };
  });
}

/**
 * Anexa os marcadores do CONTATO — a outra caixa de marcador do produto.
 *
 * O filtro de marcador do quadro lia só `crm_leads.tags`, escrita em "Editar
 * lead". Quem marca a PESSOA (no Inbox ou na ficha) escreve em `contacts.tags`,
 * e esse marcador não chegava ao quadro: não filtrava e nem aparecia na lista
 * de opções. É o mesmo desencontro que o Inbox tinha no filtro dele.
 *
 * LEFT, como o score e a conversa: negócio sem contato é estado normal, e o
 * card dele não pode sumir do quadro por não ter marcador de pessoa.
 *
 * Marcador vazio não vira campo: `contact_tags` só é escrito quando há alguma
 * etiqueta, para o payload do quadro não engordar com array vazio em todo card.
 *
 * A MESMA leitura de `contacts` também alimenta telefone, e-mail e links do card
 * (`anexarDadosDoContato`): uma consulta por quadro, não duas. Desde a Q2b ela é
 * feita uma vez só para o quadro inteiro (`lerContatosEConversas`), junto com a
 * dos filtros e a da capa.
 */
export function withMarcadoresDoContato(leadsDoQuadro: Lead[], linhas: ContatoDoQuadro[]): Lead[] {
  const leads = anexarDadosDoContato(leadsDoQuadro, linhas);

  const porContato = new Map<string, string[]>();
  for (const row of linhas) {
    const tags = row.tags ?? [];
    if (tags.length > 0) porContato.set(row.id, tags);
  }
  if (porContato.size === 0) return leads;

  return leads.map((lead) => {
    const contact_tags = lead.contact_id ? porContato.get(lead.contact_id) : undefined;
    return contact_tags ? { ...lead, contact_tags } : lead;
  });
}

/**
 * Anexa o resumo das tarefas EM ABERTO de cada negócio — o selo do card.
 *
 * Uma leitura de `crm_tasks` para o quadro inteiro, em lotes de ids como as
 * outras: o card não pode custar uma consulta por negócio. Só as abertas vêm do
 * banco, porque é só o que o selo conta; a régua de "aberta" e "atrasada" é a
 * mesma da lista do dossiê (`lib/kanban/tarefas-no-quadro.ts`).
 *
 * Erro de leitura derruba o quadro com 500, como as outras etapas desta rota:
 * um quadro que some com o selo em silêncio diria "nenhuma tarefa pendente"
 * justamente no dia em que não sabe.
 */
export async function withTarefas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  leads: Lead[],
): Promise<{ leads: Lead[]; error: string | null }> {
  const leadIds = leads.map((l) => l.id);
  if (leadIds.length === 0) return { leads, error: null };

  const { data, error } = await buscaEmLotes(leadIds, (lote) =>
    supabase
      .from("crm_tasks")
      .select("lead_id, due_date, status")
      .eq("organization_id", organizationId)
      .in("lead_id", lote)
      .in("status", ["pending", "in_progress"]),
  );
  if (error) return { leads, error: error.message };

  return {
    leads: anexarTarefasAosNegocios(leads, (data ?? []) as LinhaDaTarefaNoQuadro[]),
    error: null,
  };
}
