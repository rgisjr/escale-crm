/**
 * GET /api/v1/leads/:id/ficha — o negócio da ficha, sem carregar o quadro (fork
 * Escale; G2-9 da revisão de outubro).
 *
 * Quem abre a ficha pelo endereço direto não tem o quadro em cache; antes disso a
 * ficha baixava o funil inteiro (todos os negócios e os enriquecimentos de cada
 * um) para mostrar UM negócio. Esta rota devolve o mesmo formato do quadro
 * (`BoardData`), com o pipeline, as etapas e SÓ o negócio pedido, enriquecido
 * pelas mesmas funções da rota do quadro (`lib/kanban/enriquecer-negocios.ts`).
 *
 * Fora de propósito: a próxima ação do agente (escreve na caixa a partir de um
 * GET) e o score, que a ficha não mostra.
 *
 * Mesmas regras de visibilidade do quadro: negócio arquivado e negócio de contato
 * pessoal respondem 404. A sessão de quem olha vale (RLS) e a organização é
 * filtrada explicitamente.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { idsDeContatosPessoais } from "@/app/api/v1/conversations/_handler";
import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperada } from "@/lib/escale/configuracoes/respostas";
import { comDadosDosFiltros, lerContatosEConversas } from "@/lib/escale/filtros/ler-dados-do-quadro";
import { juntarEtapasPorLead } from "@/lib/escale/quadro/juntar-etapas";
import { traduzir } from "@/lib/i18n/dicionario";
import {
  withConversas,
  withMarcadoresDoContato,
  withOwnerAgents,
  withTarefas,
} from "@/lib/kanban/enriquecer-negocios";
import type { BoardData, Pipeline, Stage } from "@/lib/kanban/types";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/types/leads";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const ROTA = "/api/v1/leads/[id]/ficha";
const uuidValido = (id: string) => z.string().uuid().safeParse(id).success;

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_leads" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;
  const naoAchei = () => fail("not_found", t("Negócio não encontrado."), 404, { requestId });
  if (!uuidValido(id)) return naoAchei();

  const supabase = await createClient();
  const contexto = { rota: `GET ${ROTA}`, operacao: "ler" };
  const negocio = await supabase
    .from("crm_leads")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .neq("status", "archived")
    .maybeSingle();
  if (negocio.error) return falhaInesperada(negocio.error, contexto, t, requestId);
  if (!negocio.data) return naoAchei();
  const lead = negocio.data as Lead;

  const [pipeline, etapasDoFunil, pessoais] = await Promise.all([
    supabase
      .from("crm_pipelines")
      .select("*")
      .eq("organization_id", orgId)
      .eq("id", lead.pipeline_id)
      .maybeSingle(),
    supabase
      .from("crm_stages")
      .select("*")
      .eq("pipeline_id", lead.pipeline_id)
      .eq("is_archived", false)
      .order("position"),
    idsDeContatosPessoais(supabase, orgId),
  ]);
  if (pipeline.error) return falhaInesperada(pipeline.error, contexto, t, requestId);
  if (etapasDoFunil.error) return falhaInesperada(etapasDoFunil.error, contexto, t, requestId);
  if (!pipeline.data) return naoAchei();
  // Contato pessoal some do quadro e a ficha por link não pode furar isso.
  if (lead.contact_id && pessoais.includes(lead.contact_id)) return naoAchei();

  const leads = [lead];
  const lidas = await lerContatosEConversas(supabase, orgId, leads);
  if (lidas.error) return falhaInesperada(new Error(lidas.error), contexto, t, requestId);
  const etapas = await Promise.all([
    withOwnerAgents(supabase, orgId, leads),
    withTarefas(supabase, orgId, leads),
    comDadosDosFiltros(supabase, orgId, leads, lidas.linhas),
    { leads: withConversas(leads, lidas.linhas.conversas), error: null },
    { leads: withMarcadoresDoContato(leads, lidas.linhas.contatos), error: null },
  ]);
  const comErro = etapas.find((etapa) => etapa.error);
  if (comErro) return falhaInesperada(new Error(comErro.error as string), contexto, t, requestId);

  const quadro: BoardData = {
    pipeline: pipeline.data as Pipeline,
    stages: (etapasDoFunil.data ?? []) as Stage[],
    leads: juntarEtapasPorLead(
      leads,
      etapas.map((etapa) => etapa.leads),
    ),
  };
  return ok(quadro, { requestId });
}
