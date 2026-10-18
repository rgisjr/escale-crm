/**
 * GET/POST /api/v1/leads/:id/atividades — a aba Atividades da ficha (fork
 * Escale, Fase 1I; C19).
 *
 * GET (viewer ou acima): as tarefas do negócio (`crm_tasks`) juntas com a
 * linha do fork (`crm_atividades_do_negocio`) e o playbook da origem (a etapa
 * futura mostra o que vai nascer). O negócio é lido com a sessão: a RLS decide
 * quem vê, e só depois disso as tarefas (cuja RLS é a da organização) entram.
 *
 * POST (agent ou acima): a "Nova atividade" da ficha. Cria a tarefa
 * (responsável = quem criou), a linha do fork com o tipo e a etapa, e grava
 * `task_created` na linha do tempo, como a rota de tarefas do original. Se a
 * linha do fork falhar, a tarefa é apagada: não fica tarefa sem tipo na ficha.
 * Concluir, editar e excluir usam `PATCH/DELETE /api/v1/tasks/[id]`.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperada } from "@/lib/escale/configuracoes/respostas";
import { juntarAtividades, type ExtraDaAtividade } from "@/lib/escale/negocio/atividades";
import { lerJson } from "@/lib/escale/origens/respostas";
import { TIPOS_DE_ATIVIDADE, type ModeloDaEtapa } from "@/lib/escale/playbook/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { logger } from "@/lib/logger";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { registraAtividadeDaTarefa } from "@/lib/tarefas/atividade";
import type { Tarefa } from "@/lib/tarefas/tipos";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const ROTA = "/api/v1/leads/[id]/atividades";
const COLUNAS_DA_TAREFA =
  "id, organization_id, title, description, due_date, priority, status, lead_id, contact_id, demanda_id, assigned_to, created_by, created_at, updated_at";
const COLUNAS_DO_EXTRA =
  "tarefa_id, stage_id, atividade_id, tipo, visibilidade, concluida_por, concluida_em";
const COLUNAS_DO_MODELO =
  "id, stage_id, titulo, tipo, visibilidade, prazo_minutos, ordem, conteudo";
const uuidValido = (id: string) => z.string().uuid().safeParse(id).success;

const novaSchema = z
  .object({
    titulo: z.string().trim().min(1).max(255),
    tipo: z.enum(TIPOS_DE_ATIVIDADE),
    due_date: z.string().datetime({ offset: true }),
    stage_id: z.string().uuid(),
  })
  .strict();

type Banco = Awaited<ReturnType<typeof createClient>>;

async function lerNegocio(supabase: Banco, orgId: string, id: string) {
  return supabase
    .from("crm_leads")
    .select("id, pipeline_id, contact_id")
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle();
}

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_tasks" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;
  if (!uuidValido(id)) return fail("not_found", t("Negócio não encontrado."), 404, { requestId });

  const supabase = await createClient();
  const negocio = await lerNegocio(supabase, orgId, id);
  if (negocio.error)
    return falhaInesperada(negocio.error, { rota: `GET ${ROTA}`, operacao: "ler" }, t, requestId);
  if (!negocio.data) return fail("not_found", t("Negócio não encontrado."), 404, { requestId });

  const [tarefas, extras, modelos] = await Promise.all([
    supabase
      .from("crm_tasks")
      .select(COLUNAS_DA_TAREFA)
      .eq("organization_id", orgId)
      .eq("lead_id", id),
    supabase
      .from("crm_atividades_do_negocio")
      .select(COLUNAS_DO_EXTRA)
      .eq("organization_id", orgId)
      .eq("lead_id", id),
    supabase
      .from("crm_atividades_da_etapa")
      .select(COLUNAS_DO_MODELO)
      .eq("organization_id", orgId)
      .eq("pipeline_id", negocio.data.pipeline_id),
  ]);
  const erro = tarefas.error ?? extras.error ?? modelos.error;
  if (erro) return falhaInesperada(erro, { rota: `GET ${ROTA}`, operacao: "ler" }, t, requestId);

  return ok(
    {
      atividades: juntarAtividades(
        (tarefas.data ?? []) as Tarefa[],
        (extras.data ?? []) as ExtraDaAtividade[],
      ),
      modelos: (modelos.data ?? []) as ModeloDaEtapa[],
    },
    { requestId },
  );
}

export async function POST(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_tasks" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;
  if (!uuidValido(id)) return fail("not_found", t("Negócio não encontrado."), 404, { requestId });

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = novaSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("Erro ao adicionar atividade. Tente novamente."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }
  const nova = parsed.data;

  const supabase = await createClient();
  const negocio = await lerNegocio(supabase, orgId, id);
  if (negocio.error)
    return falhaInesperada(negocio.error, { rota: `POST ${ROTA}`, operacao: "ler" }, t, requestId);
  if (!negocio.data) return fail("not_found", t("Negócio não encontrado."), 404, { requestId });

  const etapa = await supabase
    .from("crm_stages")
    .select("id")
    .eq("organization_id", orgId)
    .eq("pipeline_id", negocio.data.pipeline_id)
    .eq("id", nova.stage_id)
    .eq("is_won", false)
    .eq("is_lost", false)
    .eq("is_archived", false)
    .maybeSingle();
  if (etapa.error)
    return falhaInesperada(etapa.error, { rota: `POST ${ROTA}`, operacao: "ler" }, t, requestId);
  if (!etapa.data) {
    return fail(
      "unprocessable_entity",
      t("Uma atividade está numa etapa que não é desta origem."),
      422,
      {
        requestId,
      },
    );
  }

  const criada = await supabase
    .from("crm_tasks")
    .insert({
      organization_id: orgId,
      title: nova.titulo,
      due_date: nova.due_date,
      priority: "medium",
      status: "pending",
      lead_id: id,
      contact_id: negocio.data.contact_id,
      assigned_to: authz.user.id,
      created_by: authz.user.id,
      source_kind: "escale_ficha",
    })
    .select(COLUNAS_DA_TAREFA)
    .single();
  if (criada.error || !criada.data) {
    return falhaInesperada(
      criada.error,
      { rota: `POST ${ROTA}`, operacao: "gravar" },
      t,
      requestId,
    );
  }
  const tarefa = criada.data as Tarefa;

  const extra: ExtraDaAtividade = {
    tarefa_id: tarefa.id,
    stage_id: nova.stage_id,
    atividade_id: null,
    tipo: nova.tipo,
    visibilidade: "padrao",
    concluida_por: null,
    concluida_em: null,
  };
  const gravado = await supabase.from("crm_atividades_do_negocio").insert({
    tarefa_id: tarefa.id,
    organization_id: orgId,
    lead_id: id,
    stage_id: nova.stage_id,
    tipo: nova.tipo,
    visibilidade: "padrao",
  });
  if (gravado.error) {
    const desfeito = await supabase
      .from("crm_tasks")
      .delete()
      .eq("organization_id", orgId)
      .eq("id", tarefa.id);
    if (desfeito.error)
      logger.error("atividades.desfazer", { requestId, error: desfeito.error.message });
    return falhaInesperada(
      gravado.error,
      { rota: `POST ${ROTA}`, operacao: "gravar" },
      t,
      requestId,
    );
  }

  void registraAtividadeDaTarefa(supabase, {
    organizationId: orgId,
    tarefa,
    tipo: "task_created",
    actor: { type: "user", id: authz.user.id },
  });
  void audit({
    action: "crm_task.created",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_tasks",
    resourceId: tarefa.id,
    requestId,
    metadata: { lead_id: id, tipo: nova.tipo, via: "escale" },
  });

  return ok({ atividade: juntarAtividades([tarefa], [extra])[0] }, { requestId, status: 201 });
}
