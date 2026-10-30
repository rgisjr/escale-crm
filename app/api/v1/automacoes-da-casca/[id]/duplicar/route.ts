import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { NaoEncontrada, duplicarAutomacao } from "@/lib/escale/automacoes/banco";
import { nomeDaCopia } from "@/lib/escale/automacoes/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

/** POST /api/v1/automacoes-da-casca/:id/duplicar — a cópia nasce pausada (fork Escale, Fase 5A, Q9). */
export async function POST(_req: NextRequest, ctx: Contexto): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return fail("not_found", t("Regra não encontrada."), 404, { requestId });
  try {
    const supabase = await createClient();
    const { data: regra, error } = await supabase
      .from("automation_rules")
      .select("name")
      .eq("id", id)
      .eq("organization_id", authz.org.orgId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!regra) return fail("not_found", t("Regra não encontrada."), 404, { requestId });
    const nova = await duplicarAutomacao(supabase, id, nomeDaCopia(String(regra.name)));
    void audit({
      action: "automation.rule_cloned",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "automation_rule",
      resourceId: nova.id,
      requestId,
      metadata: { de: id },
    });
    return ok({ id: nova.id }, { requestId, status: 201 });
  } catch (err) {
    if (err instanceof NaoEncontrada) return fail("not_found", t("Regra não encontrada."), 404, { requestId });
    console.error("[automacoes-da-casca] duplicar", requestId, err);
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}
