/**
 * GET /api/v1/pipelines/[id]/board
 *
 * Returns the full board snapshot for the Kanban: pipeline metadata + active
 * stages (ordered by position) + open leads (excluding archived). All RLS-
 * filtered to the caller's org via cookie session.
 *
 * Why this exists: previously useBoard hit supabase-js directly from the
 * browser. The auth cookie is httpOnly, which the browser Supabase client
 * cannot read — auth.uid() came back null and RLS dropped the pipeline row,
 * surfacing as PostgREST "Cannot coerce result to a single JSON object"
 * (PGRST116). Routing through the API ensures the server-side cookie reader
 * runs, same as every other authed query.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { loadAuthUser } from "@/lib/auth/server";
import { traduzir } from "@/lib/i18n/dicionario";
import {
  roteiaProximasAcoes,
  type EstadoDoContato,
  type PropostaAmbigua,
} from "@/lib/leads/next-action";
import type { LeadCandidate } from "@/lib/leads/active-lead";
import {
  withConversas,
  withMarcadoresDoContato,
  withOwnerAgents,
  withTarefas,
} from "@/lib/kanban/enriquecer-negocios";
import type { SupabaseClient } from "@supabase/supabase-js";
// FORK ESCALE · Fase 1D: o que os filtros e a ordenação do quadro leem.
import {
  comDadosDosFiltros,
  lerContatosEConversas,
} from "@/lib/escale/filtros/ler-dados-do-quadro";
import { juntarEtapasPorLead } from "@/lib/escale/quadro/juntar-etapas";
import { logger } from "@/lib/logger";
import { buscaEmLotes } from "@/lib/supabase/em-lotes";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { idsDeContatosPessoais } from "@/app/api/v1/conversations/_handler";
import type { BoardData, Pipeline, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import { lerEmPaginas } from "@/lib/escale/quadro/ler-em-paginas";
import { usuarioDoToken } from "@/lib/auth/claims";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

/**
 * Anexa a próxima ação proposta pelo agente aos leads que a receberam.
 *
 * Os candidatos são buscados por CONTATO na org inteira, e não só neste
 * pipeline: `resolveActiveLeadForContact` precisa enxergar todos os negócios
 * abertos da pessoa para poder chamar de ambíguo o que é ambíguo. Recortando a
 * lista por pipeline, dois negócios ambíguos em boards diferentes apareceriam
 * como um único negócio em cada board, e os dois exibiriam a mesma proposta.
 */
/**
 * Abre um item de caixa por proposta sem dono — no máximo um por contato.
 *
 * Deduplicado por (kind, ref_id, status='open') porque o board é lido a cada
 * refresh: sem isto, um contato ambíguo produziria um item por render até a
 * caixa virar ruído e ninguém mais olhar.
 *
 * Falha aqui NÃO derruba o board: o aviso é importante, mas menos que a tela
 * abrir. O erro sobe para o Sentry pelo caminho normal de exceção não tratada
 * do handler — o que não pode é o usuário perder o board por causa do aviso.
 *
 * Recebe o client de SERVIÇO: `agent_inbox_items` é server-only na VPS. A
 * organização vem do pipeline lido sob RLS no GET, então é confiável.
 */
async function avisaAmbiguas(
  admin: SupabaseClient,
  organizationId: string,
  ambiguas: PropostaAmbigua[],
): Promise<void> {
  if (ambiguas.length === 0) return;

  const { data: jaAbertos, error: erroDaLeitura } = await buscaEmLotes(
    ambiguas.map((a) => a.contact_id),
    (lote) =>
      admin
        .from("agent_inbox_items")
        .select("ref_id")
        .eq("organization_id", organizationId)
        .eq("kind", "next_action_ambiguous")
        .eq("status", "open")
        .in("ref_id", lote),
  );
  if (erroDaLeitura) {
    // Sem saber o que já está aberto, não grava: gravaria o aviso em dobro a cada leitura do quadro.
    logger.error("board.avisa_ambiguas.ler", { organizationId, erro: erroDaLeitura.message });
    return;
  }
  const abertos = new Set(
    ((jaAbertos ?? []) as Array<{ ref_id: string }>).map((r) => r.ref_id),
  );

  const novos = ambiguas
    .filter((a) => !abertos.has(a.contact_id))
    .map((a) => ({
      organization_id: organizationId,
      kind: "next_action_ambiguous",
      severity: "warn",
      title: `A IA propôs uma próxima ação, mas o contato tem ${a.candidateIds.length} negócios abertos`,
      body: `Proposta: "${a.texto}". Escolha a qual negócio ela pertence — o sistema não adivinha para não executar no negócio errado.`,
      ref_kind: "contact",
      ref_id: a.contact_id,
      status: "open",
    }));
  if (novos.length === 0) return;

  const { error: erroDoInsert } = await admin.from("agent_inbox_items").insert(novos);
  if (!erroDoInsert) return;
  if (erroDoInsert.code === "23505") {
    // Outra leitura do quadro avisou entre a checagem e a gravação (índice único do aviso aberto):
    // grava um a um e deixa passar só o que já existe.
    for (const aviso of novos) {
      const { error } = await admin.from("agent_inbox_items").insert(aviso);
      if (error && error.code !== "23505") {
        logger.error("board.avisa_ambiguas.gravar", { organizationId, erro: error.message });
      }
    }
    return;
  }
  logger.error("board.avisa_ambiguas.gravar", { organizationId, erro: erroDoInsert.message });
}

/**
 * Anexa o score aos leads que o têm — LEFT JOIN, nunca INNER.
 *
 * Score ausente é estado legítimo (sinal insuficiente, cenário 17). Um INNER
 * apagaria do quadro justamente os leads sem sinal, que são os que mais
 * precisam de atenção humana — o oposto do que o produto existe para fazer.
 *
 * A faixa vem PERSISTIDA e é entregue como está: recalculá-la aqui (ou na UI)
 * ignoraria a histerese e devolveria o card piscando na fronteira, no único
 * lugar onde o CHECK de coerência não alcança.
 */
async function withScores(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  leads: Lead[],
): Promise<{ leads: Lead[]; error: string | null }> {
  if (leads.length === 0) return { leads, error: null };

  const { data, error } = await buscaEmLotes(
    leads.map((l) => l.id),
    (lote) =>
      supabase
        .from("crm_lead_scores")
        .select(
          "lead_id, ai_probability, ai_probability_reason, ai_probability_band, ai_probability_evidence, ai_probability_at",
        )
        .eq("organization_id", organizationId)
        .in("lead_id", lote),
  );
  if (error) return { leads, error: error.message };

  const porLead = new Map<string, NonNullable<Lead["score"]>>();
  for (const row of (data ?? []) as Array<{
    lead_id: string;
    ai_probability: number | string | null;
    ai_probability_reason: string | null;
    ai_probability_band: string | null;
    ai_probability_evidence: { factors?: unknown } | null;
    ai_probability_at: string | null;
  }>) {
    // `numeric` chega como string no supabase-js; `null` continua null — e a
    // diferença entre null e 0 é justamente o que não pode se perder aqui.
    if (row.ai_probability === null || row.ai_probability_band === null) continue;
    const factors = Array.isArray(row.ai_probability_evidence?.factors)
      ? (row.ai_probability_evidence.factors as NonNullable<Lead["score"]>["factors"])
      : [];
    porLead.set(row.lead_id, {
      probability: Number(row.ai_probability),
      reason: row.ai_probability_reason ?? "",
      band: row.ai_probability_band as NonNullable<Lead["score"]>["band"],
      factors,
      at: row.ai_probability_at,
    });
  }

  return {
    leads: leads.map((lead) => {
      const score = porLead.get(lead.id);
      return score ? { ...lead, score } : lead;
    }),
    error: null,
  };
}

/**
 * Recebe o client de SERVIÇO: `lead_state` e `agent_inbox_items` são server-only
 * na VPS, e pela sessão a próxima ação nunca aparecia no quadro. A organização
 * vem do pipeline lido sob RLS no GET, então é confiável.
 */
async function withNextActions(
  admin: SupabaseClient,
  organizationId: string,
  leads: Lead[],
  defaultPipelineId: string | null,
): Promise<{ leads: Lead[]; error: string | null }> {
  const contactIds = [
    ...new Set(leads.map((l) => l.contact_id).filter((c): c is string => !!c)),
  ];
  if (contactIds.length === 0) return { leads, error: null };

  const [{ data: estados, error: estadosErr }, { data: candidatos, error: candErr }] =
    await Promise.all([
      buscaEmLotes(contactIds, (lote) =>
        admin
          .from("lead_state")
          .select("contact_id, next_action, next_action_seq, updated_at")
          .eq("organization_id", organizationId)
          .in("contact_id", lote)
          .not("next_action", "is", null),
      ),
      buscaEmLotes(contactIds, (lote) =>
        admin
          .from("crm_leads")
          .select(
            "id, organization_id, pipeline_id, status, last_activity_at, created_at, contact_id",
          )
          .eq("organization_id", organizationId)
          .eq("status", "open")
          .in("contact_id", lote),
      ),
    ]);
  if (estadosErr) return { leads, error: estadosErr.message };
  if (candErr) return { leads, error: candErr.message };
  if (!estados || estados.length === 0) return { leads, error: null };

  const { porLead, ambiguas } = roteiaProximasAcoes(
    estados as EstadoDoContato[],
    (candidatos ?? []) as Array<LeadCandidate & { contact_id: string | null }>,
    { defaultPipelineId },
  );

  // Recusar o palpite não pode virar silêncio: a proposta que não achou dono vai
  // para a caixa, onde um humano desambigua. Escrever a partir de um GET não é
  // bonito, e é deliberado — a ambiguidade só EXISTE quando se olha o conjunto
  // de negócios abertos AGORA, e é aqui que esse olhar acontece. Fazer no
  // momento da escrita da proposta perderia o caso em que o segundo negócio
  // nasce depois dela.
  await avisaAmbiguas(admin, organizationId, ambiguas);

  if (porLead.size === 0) return { leads, error: null };

  return {
    leads: leads.map((lead) => {
      const acao = porLead.get(lead.id);
      return acao ? { ...lead, next_action: acao } : lead;
    }),
    error: null,
  };
}

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const { id: pipelineId } = await ctx.params;

  const supabase = await createClient();
  const { usuario: user, error: authErr } = await usuarioDoToken(supabase);
  if (authErr || !user) {
    return fail("unauthenticated", "Auth required.", 401, { requestId });
  }
  const authUser = await loadAuthUser();
  const t = (texto: string) => traduzir(texto, authUser?.idioma ?? "pt-BR");

  const [
    { data: pipeline, error: pipelineErr },
    { data: stages, error: stagesErr },
    { data: leads, error: leadsErr },
  ] = await Promise.all([
    supabase.from("crm_pipelines").select("*").eq("id", pipelineId).maybeSingle(),
    supabase
      .from("crm_stages")
      .select("*")
      .eq("pipeline_id", pipelineId)
      .eq("is_archived", false)
      .order("position"),
    // O PostgREST corta cada resposta em `max_rows` (1.000) sem avisar: lê em
    // páginas até esgotar, com `id` de desempate para a ordem não oscilar.
    lerEmPaginas((de, ate) =>
      supabase
        .from("crm_leads")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .neq("status", "archived")
        .order("position_in_stage")
        .order("id")
        .range(de, ate),
    ),
  ]);

  if (pipelineErr) return fail("internal_error", pipelineErr.message, 500, { requestId });
  if (stagesErr) return fail("internal_error", stagesErr.message, 500, { requestId });
  if (leadsErr) return fail("internal_error", leadsErr.message, 500, { requestId });
  if (!pipeline) return fail("resource_not_found", t("Pipeline não encontrado."), 404, { requestId });

  // Contato pessoal some do board mas a linha continua no banco (spec 21, etapa
  // 8, decisão 2 — critério 4): o card não é listado e volta ao desmarcar, com
  // o histórico intacto. Filtro em memória sobre a lista já lida: a leitura dos
  // negócios já foi feita em páginas, então nada se perde por filtrar depois.
  // NUNCA `delete`.
  const organizationId = (pipeline as Pipeline).organization_id;
  const [pessoais, { data: pipelinePadrao }] = await Promise.all([
    idsDeContatosPessoais(supabase, organizationId),
    supabase
      .from("crm_pipelines")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("is_default", true)
      .maybeSingle(),
  ]);
  const ehPessoal = new Set(pessoais);
  const leadsVisiveis =
    ehPessoal.size > 0
      ? ((leads ?? []) as Lead[]).filter((l) => l.contact_id === null || !ehPessoal.has(l.contact_id))
      : ((leads ?? []) as Lead[]);

  // Q2b (G2-3): as etapas só acrescentam, cada uma, o PRÓPRIO campo ao negócio
  // (nenhuma lê o que a outra escreve), então correm juntas e `juntarEtapasPorLead`
  // soma o que cada uma trouxe, casando por `lead.id`. Contatos e conversas são lidos
  // UMA vez para o quadro (G2-2) e entregues às três etapas que os usam. O erro
  // devolvido é o da primeira etapa que falhou, na ordem de sempre.
  const contatosEConversas = lerContatosEConversas(supabase, organizationId, leadsVisiveis);
  const comContatos = async (
    etapa: (linhas: Awaited<typeof contatosEConversas>["linhas"]) => Lead[],
  ): Promise<{ leads: Lead[]; error: string | null }> => {
    const lidas = await contatosEConversas;
    if (lidas.error) return { leads: leadsVisiveis, error: lidas.error };
    return { leads: etapa(lidas.linhas), error: null };
  };
  const etapas = await Promise.all([
    withOwnerAgents(supabase, organizationId, leadsVisiveis),
    withNextActions(
      createAdminClient(),
      organizationId,
      leadsVisiveis,
      (pipelinePadrao as { id: string } | null)?.id ?? null,
    ),
    withScores(supabase, organizationId, leadsVisiveis),
    withTarefas(supabase, organizationId, leadsVisiveis),
    // FORK ESCALE · Fase 1D: atividades concluídas, nome do contato e a conversa
    // da capa para os filtros e a ordenação do quadro.
    contatosEConversas.then((lidas) =>
      lidas.error
        ? { leads: leadsVisiveis, error: lidas.error }
        : comDadosDosFiltros(supabase, organizationId, leadsVisiveis, lidas.linhas),
    ),
    comContatos((linhas) => withConversas(leadsVisiveis, linhas.conversas)),
    comContatos((linhas) => withMarcadoresDoContato(leadsVisiveis, linhas.contatos)),
  ]);
  const comErro = etapas.find((etapa) => etapa.error);
  if (comErro) return fail("internal_error", comErro.error as string, 500, { requestId });

  const board: BoardData = {
    pipeline: pipeline as Pipeline,
    stages: (stages ?? []) as Stage[],
    leads: juntarEtapasPorLead(
      leadsVisiveis,
      etapas.map((etapa) => etapa.leads),
    ),
  };

  return ok(board, { requestId });
}
