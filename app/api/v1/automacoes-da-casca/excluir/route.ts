import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { excluirEmLote } from "@/lib/escale/automacoes/banco";
import { loteSchema } from "@/lib/escale/automacoes/schema";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** POST /api/v1/automacoes-da-casca/excluir — exclui até 100 automações (fork Escale, Fase 5A, Q16). */
export async function POST(req: NextRequest): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = loteSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) return fail("validation_failed", t("Falha na validação dos dados!"), 422, { requestId });
  try {
    const r = await excluirEmLote(await createClient(), authz.org.orgId, lido.data.ids);
    for (const id of r.excluidas) {
      void audit({
        action: "automation.rule_deleted",
        actorUserId: authz.user.id,
        organizationId: authz.org.orgId,
        resourceType: "automation_rule",
        resourceId: id,
        requestId,
      });
    }
    return ok(r, { requestId });
  } catch (err) {
    console.error("[automacoes-da-casca] excluir", requestId, err);
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}
