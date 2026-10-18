/**
 * GET/PATCH /api/v1/leads/:id/atribuicao-de-ganho — o crédito do negócio
 * ganho (fork Escale, Fase 1K, D14; a janela "Atribuição de ganho" da Clint).
 *
 * GET: quem vê o negócio (agente ou acima), com a sessão (RLS da 9014). PATCH:
 * só administrador; troca a pessoa e a data pela `fn_escale_corrigir_ganho`,
 * com o service role (N18). Não mexe no fechamento do negócio.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { podeAdministrarEmpresa } from "@/lib/auth/pode-administrar-empresa";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperada } from "@/lib/escale/configuracoes/respostas";
import { lerAtribuicao, type AtribuicaoDeGanho } from "@/lib/escale/ganho/regras";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export interface GanhoDoNegocio {
  creditadoA: string | null;
  ganhoEm: string;
  pelaRegra: boolean;
  regras: AtribuicaoDeGanho | null;
  corrigidoEm: string | null;
}

const ROTA = "/api/v1/leads/[id]/atribuicao-de-ganho";
const corpoSchema = z
  .object({
    creditado_a: z.string().uuid().nullable(),
    ganho_em: z.string().datetime({ offset: true }),
  })
  .strict();

async function ler(orgId: string, leadId: string) {
  return (await createClient())
    .from("crm_ganho_do_negocio")
    .select("creditado_a, ganho_em, pela_regra, regras, corrigido_em")
    .eq("organization_id", orgId)
    .eq("lead_id", leadId)
    .maybeSingle();
}

function montar(l: Record<string, unknown> | null): GanhoDoNegocio | null {
  if (!l) return null;
  return {
    creditadoA: typeof l.creditado_a === "string" ? l.creditado_a.toLowerCase() : null,
    ganhoEm: String(l.ganho_em),
    pelaRegra: l.pela_regra === true,
    regras: l.regras ? lerAtribuicao({ escale_atribuicao_de_ganho: l.regras }) : null,
    corrigidoEm: typeof l.corrigido_em === "string" ? l.corrigido_em : null,
  };
}

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_leads" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success)
    return fail("not_found", t("Lead não encontrado."), 404, { requestId });
  const { data, error } = await ler(authz.org.orgId, id);
  if (error) return falhaInesperada(error, { rota: `GET ${ROTA}`, operacao: "ler" }, t, requestId);
  return ok(montar(data as Record<string, unknown> | null), { requestId });
}

export async function PATCH(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_leads" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  if (!podeAdministrarEmpresa(authz.user, authz.org)) {
    return fail("forbidden", t("Só o administrador altera a atribuição do ganho."), 403, {
      requestId,
    });
  }
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success)
    return fail("not_found", t("Lead não encontrado."), 404, { requestId });
  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = corpoSchema.safeParse(lido.json);
  if (!parsed.success) return fail("unprocessable_entity", t("Data inválida."), 422, { requestId });

  const { error } = await createAdminClient().rpc("fn_escale_corrigir_ganho", {
    p_org: authz.org.orgId,
    p_lead: id,
    p_autor: authz.user.id,
    p_creditado_a: parsed.data.creditado_a,
    p_ganho_em: parsed.data.ganho_em,
  });
  if (error) {
    if (error.code === "22023")
      return fail("unprocessable_entity", t("Data inválida."), 422, { requestId });
    if (error.code === "PT422")
      return fail("unprocessable_entity", t("Este usuário não faz parte da equipe."), 422, {
        requestId,
      });
    if (error.code === "PT404")
      return fail("not_found", t("Negócio ganho não encontrado."), 404, { requestId });
    return falhaInesperada(error, { rota: `PATCH ${ROTA}`, operacao: "gravar" }, t, requestId);
  }
  void audit({
    action: "lead.updated",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "lead",
    resourceId: id,
    requestId,
    metadata: { via: "escale", acao: "atribuicao_de_ganho" },
  });
  const relido = await ler(authz.org.orgId, id);
  if (relido.error)
    return falhaInesperada(
      relido.error,
      { rota: `PATCH ${ROTA}`, operacao: "reler" },
      t,
      requestId,
    );
  return ok(montar(relido.data as Record<string, unknown> | null), { requestId });
}
