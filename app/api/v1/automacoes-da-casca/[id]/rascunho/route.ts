import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { RECUSA_RASCUNHO_SEM_GATILHO } from "@/lib/escale/automacoes/fluxo/frases-do-rascunho";
import {
  criarEsqueleto,
  descartarEsqueleto,
  descartarRascunho,
  eventoDoRascunho,
  gravarRascunho,
  lerRascunho,
  rascunhoSchema,
  regraDaOrganizacao,
} from "@/lib/escale/automacoes/rascunho";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

// FORK ESCALE · automações: o rascunho de uma automação — ler (GET), salvar sem publicar (PUT) e descartar (DELETE).
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

const uuid = z.string().uuid();
const idDoPut = z.union([z.literal("novo"), z.string().uuid()]);

/** GET /api/v1/automacoes-da-casca/:id/rascunho — o rascunho pendente; `null` quando não há. */
export async function GET(_req: NextRequest, ctx: Contexto): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) return fail("not_found", t("Regra não encontrada."), 404, { requestId });
  try {
    const rascunho = await lerRascunho(await createClient(), authz.org.orgId, id);
    return ok({ rascunho }, { requestId });
  } catch (err) {
    console.error("[automacoes-da-casca] ler rascunho", requestId, err);
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}

/**
 * PUT /api/v1/automacoes-da-casca/:id/rascunho — grava o desenho como está, sem publicar. `novo` cria a
 * regra-esqueleto (pausada, sem ação) com o gatilho escolhido; é a única recusa: sem gatilho.
 */
export async function PUT(req: NextRequest, ctx: Contexto): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!idDoPut.safeParse(id).success) return fail("not_found", t("Regra não encontrada."), 404, { requestId });
  const lido = rascunhoSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) return fail("validation_failed", t("Falha na validação dos dados!"), 422, { requestId });

  const db = await createClient();
  const orgId = authz.org.orgId;
  const nova = id === "novo";
  try {
    let ruleId = id;
    if (nova) {
      const evento = eventoDoRascunho(lido.data.desenho);
      if (!evento) return fail("validation_failed", t(RECUSA_RASCUNHO_SEM_GATILHO), 422, { requestId });
      ruleId = await criarEsqueleto(db, { orgId, userId: authz.user.id, nome: lido.data.nome, evento });
      void audit({
        action: "automation.rule_created",
        actorUserId: authz.user.id,
        organizationId: orgId,
        resourceType: "automation_rule",
        resourceId: ruleId,
        requestId,
        metadata: { rascunho: true },
      });
    } else if (!(await regraDaOrganizacao(db, orgId, id))) {
      return fail("not_found", t("Regra não encontrada."), 404, { requestId });
    }

    let atualizadoEm: string;
    try {
      atualizadoEm = await gravarRascunho(db, { orgId, ruleId, userId: authz.user.id, ...lido.data });
    } catch (err) {
      // A regra que acabou de nascer sem o rascunho ficaria vazia na lista: sai junto (só ela).
      if (nova) await descartarEsqueleto(db, orgId, ruleId).catch(() => undefined);
      throw err;
    }
    void audit({
      action: "automation.draft_saved",
      actorUserId: authz.user.id,
      organizationId: orgId,
      resourceType: "automation_rule",
      resourceId: ruleId,
      requestId,
    });
    return ok({ ruleId, atualizadoEm, criada: nova }, { requestId });
  } catch (err) {
    console.error("[automacoes-da-casca] gravar rascunho", requestId, err);
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}

/** DELETE /api/v1/automacoes-da-casca/:id/rascunho — descarta o rascunho; a versão publicada não muda. */
export async function DELETE(_req: NextRequest, ctx: Contexto): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) return fail("not_found", t("Regra não encontrada."), 404, { requestId });
  try {
    await descartarRascunho(await createClient(), authz.org.orgId, id);
    void audit({
      action: "automation.draft_discarded",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "automation_rule",
      resourceId: id,
      requestId,
    });
    return ok({ descartado: true }, { requestId });
  } catch (err) {
    console.error("[automacoes-da-casca] descartar rascunho", requestId, err);
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}
