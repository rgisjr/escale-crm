/**
 * GET/PATCH /api/v1/pipelines/:id/configuracoes — a tela "Configurações da
 * origem" da casca (fork Escale, Fase 1F).
 *
 * GET: gerente ou acima (é quem abre a tela, pelo ⋮ do painel Origens). PATCH:
 * as seções que mudaram, juntas (o "Salvar" único da Clint), num `update` só.
 * Gerais e alerta são de gerente ou acima; motivos e campos o original reserva
 * ao administrador (`updatePipelineConfig`), e aqui também.
 *
 * A escrita é no `crm_pipelines.settings`, com a sessão de quem pede (RLS
 * `crm_pipelines_manager_write`). Só as chaves das seções mudam
 * (`aplicarConfiguracoes`); `settings.fields` é a projeção do catálogo do CRM
 * (1F-a) e só ganha o `obrigatorio_em` novo. A `organization_id` vem da sessão e
 * entra no filtro da leitura e da escrita.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { podeAdministrarEmpresa } from "@/lib/auth/pode-administrar-empresa";
import { requireRole } from "@/lib/auth/require-role";
import { DEFAULT_VISIBILITY_MODE } from "@/lib/auth/types";
import {
  SECOES_DO_ADMINISTRADOR,
  aplicarConfiguracoes,
  patchDasConfiguracoesSchema,
  secoesDoPatch,
} from "@/lib/escale/configuracoes/gravar";
import {
  falhaInesperada,
  lerOrigemDaConfiguracao,
  respostaDoErroDeGravacao,
  responderComConfiguracoes,
} from "@/lib/escale/configuracoes/respostas";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { moedaServidaOu } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const ROTA = "/api/v1/pipelines/[id]/configuracoes";
const uuidValido = (id: string) => z.string().uuid().safeParse(id).success;

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!uuidValido(id)) return fail("not_found", t("Origem não encontrada."), 404, { requestId });

  return responderComConfiguracoes(
    await createClient(),
    {
      orgId: authz.org.orgId,
      pipelineId: id,
      moedaDaOrganizacao: moedaServidaOu(authz.org.currency),
      visualizacao: authz.org.visibility_mode ?? DEFAULT_VISIBILITY_MODE,
      podeAdministrar: podeAdministrarEmpresa(authz.user, authz.org),
    },
    t,
    requestId,
    { rota: `GET ${ROTA}`, operacao: "ler" },
  );
}

export async function PATCH(req: NextRequest, ctx: RouteCtx): Promise<Response> {
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
  const parsed = patchDasConfiguracoesSchema.safeParse(lido.json);
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

  const podeAdministrar = podeAdministrarEmpresa(authz.user, authz.org);
  const secoes = secoesDoPatch(parsed.data);
  if (secoes.some((s) => SECOES_DO_ADMINISTRADOR.includes(s)) && !podeAdministrar) {
    return fail(
      "forbidden",
      t("Só administrador muda motivos de perda e campos obrigatórios."),
      403,
      { requestId },
    );
  }

  const supabase = await createClient();
  const origem = await lerOrigemDaConfiguracao(supabase, orgId, id);
  if (!origem.ok) {
    return origem.erro === "nao_encontrada"
      ? fail("not_found", t("Origem não encontrada."), 404, { requestId })
      : falhaInesperada(origem.causa, { rota: `PATCH ${ROTA}`, operacao: "ler" }, t, requestId);
  }

  const veredito = aplicarConfiguracoes(origem.pipeline.settings, parsed.data, {
    abertas: origem.etapas.filter((e) => !e.is_won && !e.is_lost).map((e) => e.id),
    vivas: origem.etapas.map((e) => e.id),
  });
  if (!veredito.ok) return fail("unprocessable_entity", t(veredito.erro), 422, { requestId });

  const { error } = await supabase
    .from("crm_pipelines")
    .update({ settings: veredito.settings })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error)
    return respostaDoErroDeGravacao(
      error,
      { rota: `PATCH ${ROTA}`, operacao: "gravar" },
      t,
      requestId,
    );

  void audit({
    action: "pipeline.config_updated",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "pipeline",
    resourceId: origem.pipeline.id,
    requestId,
    metadata: { secoes, via: "escale" },
  });

  return responderComConfiguracoes(
    supabase,
    {
      orgId,
      pipelineId: id,
      moedaDaOrganizacao: moedaServidaOu(authz.org.currency),
      visualizacao: authz.org.visibility_mode ?? DEFAULT_VISIBILITY_MODE,
      podeAdministrar,
    },
    t,
    requestId,
    { rota: `PATCH ${ROTA}`, operacao: "reler" },
  );
}
