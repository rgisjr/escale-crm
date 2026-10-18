/**
 * GET/PUT /api/v1/pipelines/:id/playbook — o playbook da origem (fork Escale,
 * Fase 1I; D10): as atividades de cada etapa.
 *
 * GET e PUT: gerente ou acima (quem abre a janela da origem; PRD §5). O PUT
 * troca a lista inteira (o "Salvar na origem" da Clint) pela
 * `fn_escale_salvar_playbook`, com a sessão de quem pede: a RLS vale, e a
 * função recusa etapa que não é aberta desta origem (22023 → 422). A
 * `organization_id` vem da sessão, nunca do corpo.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperada } from "@/lib/escale/configuracoes/respostas";
import { lerJson } from "@/lib/escale/origens/respostas";
import { playbookSchema, type ModeloDaEtapa } from "@/lib/escale/playbook/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const ROTA = "/api/v1/pipelines/[id]/playbook";
const COLUNAS = "id, stage_id, titulo, tipo, visibilidade, prazo_minutos, ordem, conteudo";
const uuidValido = (id: string) => z.string().uuid().safeParse(id).success;

type Banco = Awaited<ReturnType<typeof createClient>>;
type Leitura = { ok: true; atividades: ModeloDaEtapa[] } | { ok: false; causa: unknown | null };

async function lerPlaybook(supabase: Banco, orgId: string, pipelineId: string): Promise<Leitura> {
  const origem = await supabase
    .from("crm_pipelines")
    .select("id")
    .eq("organization_id", orgId)
    .eq("id", pipelineId)
    .maybeSingle();
  if (origem.error) return { ok: false, causa: origem.error };
  if (!origem.data) return { ok: false, causa: null };
  const lista = await supabase
    .from("crm_atividades_da_etapa")
    .select(COLUNAS)
    .eq("organization_id", orgId)
    .eq("pipeline_id", pipelineId)
    .order("prazo_minutos")
    .order("ordem");
  if (lista.error) return { ok: false, causa: lista.error };
  return { ok: true, atividades: (lista.data ?? []) as ModeloDaEtapa[] };
}

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!uuidValido(id)) return fail("not_found", t("Origem não encontrada."), 404, { requestId });

  const lido = await lerPlaybook(await createClient(), authz.org.orgId, id);
  if (!lido.ok) {
    return lido.causa
      ? falhaInesperada(lido.causa, { rota: `GET ${ROTA}`, operacao: "ler" }, t, requestId)
      : fail("not_found", t("Origem não encontrada."), 404, { requestId });
  }
  return ok({ atividades: lido.atividades }, { requestId });
}

export async function PUT(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;
  if (!uuidValido(id)) return fail("not_found", t("Origem não encontrada."), 404, { requestId });

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = playbookSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail(
      "unprocessable_entity",
      t("Não consegui completar essa ação. Tente de novo."),
      422,
      {
        requestId,
        details: parsed.error.flatten(),
      },
    );
  }

  const supabase = await createClient();
  const antes = await lerPlaybook(supabase, orgId, id);
  if (!antes.ok) {
    return antes.causa
      ? falhaInesperada(antes.causa, { rota: `PUT ${ROTA}`, operacao: "ler" }, t, requestId)
      : fail("not_found", t("Origem não encontrada."), 404, { requestId });
  }

  const { error } = await supabase.rpc("fn_escale_salvar_playbook", {
    p_org: orgId,
    p_pipeline: id,
    p_atividades: parsed.data.atividades,
  });
  if (error) {
    if (error.code === "22023") {
      return fail(
        "unprocessable_entity",
        t("Uma atividade está numa etapa que não é desta origem."),
        422,
        {
          requestId,
        },
      );
    }
    if (error.code === "42501") return fail("forbidden", t("Sem permissão."), 403, { requestId });
    return falhaInesperada(error, { rota: `PUT ${ROTA}`, operacao: "gravar" }, t, requestId);
  }

  void audit({
    action: "pipeline.config_updated",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "pipeline",
    resourceId: id,
    requestId,
    metadata: { secoes: ["playbook"], atividades: parsed.data.atividades.length, via: "escale" },
  });

  const depois = await lerPlaybook(supabase, orgId, id);
  if (!depois.ok) {
    return depois.causa
      ? falhaInesperada(depois.causa, { rota: `PUT ${ROTA}`, operacao: "reler" }, t, requestId)
      : fail("not_found", t("Origem não encontrada."), 404, { requestId });
  }
  return ok({ atividades: depois.atividades }, { requestId });
}
