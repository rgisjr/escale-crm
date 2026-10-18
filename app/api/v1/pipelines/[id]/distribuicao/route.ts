/**
 * PUT /api/v1/pipelines/:id/distribuicao — grava a distribuição de dono da
 * origem (fork Escale, Fase 1K, D13; Clint `Is`).
 *
 * Só administrador (a Clint mostra a subaba só a ele). A rota confere a soma
 * e quem pode receber (membro ativo agente, gerente ou admin, com acesso à
 * origem pela régua da 1J) e grava por `fn_escale_salvar_distribuicao` com o
 * service role (N7): a função, fechada ao `authenticated`, revalida tudo.
 * Responde a origem relida, como a rota de configurações.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { podeAdministrarEmpresa } from "@/lib/auth/pode-administrar-empresa";
import { requireRole } from "@/lib/auth/require-role";
import type { Role } from "@/lib/auth/types";
import { modoDaOrganizacao } from "@/lib/escale/acesso/modo-da-organizacao";
import { pessoasDaOrigem, temAcessoAOrigem } from "@/lib/escale/acesso/regras";
import {
  falhaInesperada,
  lerOrigemDaConfiguracao,
  responderComConfiguracoes,
} from "@/lib/escale/configuracoes/respostas";
import { papeisAtivos } from "@/lib/escale/distribuicao/ler";
import {
  DISTRIBUICAO_MAX,
  erroDaDistribuicao,
  textoDoPercentual,
} from "@/lib/escale/distribuicao/regras";
import { respostaDoBancoDaDistribuicao } from "@/lib/escale/distribuicao/respostas";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { moedaServidaOu } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const ROTA = "/api/v1/pipelines/[id]/distribuicao";
const PAPEIS_QUE_RECEBEM = ["agent", "manager", "admin"];

const corpoSchema = z
  .object({
    pessoas: z
      .array(
        z.object({ user_id: z.string().uuid(), percentual: z.number().gt(0).max(100) }).strict(),
      )
      .max(DISTRIBUICAO_MAX),
    reiniciar: z.boolean(),
  })
  .strict();

export async function PUT(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  if (!podeAdministrarEmpresa(authz.user, authz.org)) {
    return fail("forbidden", t("Só administrador muda a distribuição de dono."), 403, {
      requestId,
    });
  }
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("not_found", t("Origem não encontrada."), 404, { requestId });
  }

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = corpoSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail(
      "unprocessable_entity",
      t("Verificar se as porcentagens são maiores que 0%."),
      422,
      {
        requestId,
        details: parsed.error.flatten(),
      },
    );
  }
  const pessoas = parsed.data.pessoas.map((p) => ({ ...p, user_id: p.user_id.toLowerCase() }));
  const erro = erroDaDistribuicao(
    pessoas.map((p) => ({
      userId: p.user_id,
      percentual: textoDoPercentual(p.percentual),
      papel: null,
    })),
  );
  if (erro) return fail("unprocessable_entity", t(erro), 422, { requestId });
  if (new Set(pessoas.map((p) => p.user_id)).size !== pessoas.length) {
    return fail(
      "unprocessable_entity",
      t("Verificar o total das porcentagens, deve somar 100%."),
      422,
      {
        requestId,
      },
    );
  }

  const supabase = await createClient();
  const origem = await lerOrigemDaConfiguracao(supabase, orgId, id);
  if (!origem.ok) {
    return origem.erro === "nao_encontrada"
      ? fail("not_found", t("Origem não encontrada."), 404, { requestId })
      : falhaInesperada(origem.causa, { rota: `PUT ${ROTA}`, operacao: "ler" }, t, requestId);
  }
  const membros = await papeisAtivos(supabase, orgId);
  if (!membros.ok)
    return falhaInesperada(membros.causa, { rota: `PUT ${ROTA}`, operacao: "ler" }, t, requestId);
  const listaDaOrigem = pessoasDaOrigem(origem.pipeline.settings);
  const listaDoGrupo = pessoasDaOrigem(origem.grupo?.settings);
  const semPermissao = pessoas.some((p) => {
    const papel = membros.papeis.get(p.user_id);
    return (
      !papel ||
      !PAPEIS_QUE_RECEBEM.includes(papel) ||
      !temAcessoAOrigem({
        papel: papel as Role,
        userId: p.user_id,
        pessoas: listaDaOrigem,
        pessoasDoGrupo: listaDoGrupo,
      })
    );
  });
  if (semPermissao) {
    return fail("unprocessable_entity", t("Este usuário não possui permissão nesta origem."), 422, {
      requestId,
    });
  }

  const { error } = await createAdminClient().rpc("fn_escale_salvar_distribuicao", {
    p_org: orgId,
    p_origem: id,
    p_autor: authz.user.id,
    p_pessoas: pessoas,
    p_reiniciar: parsed.data.reiniciar,
  });
  if (error)
    return respostaDoBancoDaDistribuicao(
      error,
      { rota: `PUT ${ROTA}`, operacao: "gravar" },
      t,
      requestId,
    );

  void audit({
    action: "pipeline.config_updated",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "pipeline",
    resourceId: id,
    requestId,
    metadata: { secoes: ["distribuicao"], via: "escale" },
  });

  return responderComConfiguracoes(
    supabase,
    {
      orgId,
      pipelineId: id,
      moedaDaOrganizacao: moedaServidaOu(authz.org.currency),
      visualizacaoDaOrganizacao: await modoDaOrganizacao(orgId, requestId),
      podeAdministrar: true,
    },
    t,
    requestId,
    { rota: `PUT ${ROTA}`, operacao: "reler" },
  );
}
