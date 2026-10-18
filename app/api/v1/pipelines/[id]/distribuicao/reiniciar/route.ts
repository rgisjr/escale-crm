/**
 * POST /api/v1/pipelines/:id/distribuicao/reiniciar — "Resetar distribuição"
 * (fork Escale, Fase 1K, D13; Clint `us`): zera contador e índice e apaga as
 * distribuições feitas desta origem. Só administrador; grava com o service role
 * pela `fn_escale_reiniciar_distribuicao`, que registra o reinício com o autor
 * (a auditoria do reset), e a rota audita também.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { podeAdministrarEmpresa } from "@/lib/auth/pode-administrar-empresa";
import { requireRole } from "@/lib/auth/require-role";
import { modoDaOrganizacao } from "@/lib/escale/acesso/modo-da-organizacao";
import { responderComConfiguracoes } from "@/lib/escale/configuracoes/respostas";
import { respostaDoBancoDaDistribuicao } from "@/lib/escale/distribuicao/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { moedaServidaOu } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const ROTA = "/api/v1/pipelines/[id]/distribuicao/reiniciar";

export async function POST(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
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

  const { error } = await createAdminClient().rpc("fn_escale_reiniciar_distribuicao", {
    p_org: orgId,
    p_origem: id,
    p_autor: authz.user.id,
  });
  if (error)
    return respostaDoBancoDaDistribuicao(
      error,
      { rota: `POST ${ROTA}`, operacao: "gravar" },
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
    metadata: { secoes: ["distribuicao"], acao: "reiniciar", via: "escale" },
  });

  return responderComConfiguracoes(
    await createClient(),
    {
      orgId,
      pipelineId: id,
      moedaDaOrganizacao: moedaServidaOu(authz.org.currency),
      visualizacaoDaOrganizacao: await modoDaOrganizacao(orgId, requestId),
      podeAdministrar: true,
    },
    t,
    requestId,
    { rota: `POST ${ROTA}`, operacao: "reler" },
  );
}
