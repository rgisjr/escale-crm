import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { organizarAutomacao } from "@/lib/escale/automacoes/banco";
import { organizacaoSchema } from "@/lib/escale/automacoes/schema";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

/** PUT /api/v1/automacoes-da-casca/:id/organizacao — a pasta e a forma da automação (fork Escale, Fase 5A). */
export async function PUT(req: NextRequest, ctx: Contexto): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return fail("not_found", t("Regra não encontrada."), 404, { requestId });
  const lido = organizacaoSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) return fail("validation_failed", t("Falha na validação dos dados!"), 422, { requestId });
  try {
    const r = await organizarAutomacao(await createClient(), authz.org.orgId, id, lido.data);
    if (r === "nao_encontrada") return fail("not_found", t("Regra não encontrada."), 404, { requestId });
    if (r === "pasta_invalida") {
      return fail("validation_failed", t("A pasta escolhida não existe mais."), 422, { requestId });
    }
    if (lido.data.pasta_id !== undefined) {
      void audit({
        action: "automation.rule_moved",
        actorUserId: authz.user.id,
        organizationId: authz.org.orgId,
        resourceType: "automation_rule",
        resourceId: id,
        requestId,
        metadata: { pasta_id: lido.data.pasta_id },
      });
    }
    return ok({ id }, { requestId });
  } catch (err) {
    console.error("[automacoes-da-casca] organizar", requestId, err);
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}
