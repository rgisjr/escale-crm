import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { criarPasta } from "@/lib/escale/automacoes/banco";
import { pastaSchema } from "@/lib/escale/automacoes/schema";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** POST /api/v1/automacoes-da-casca/pastas — cria uma pasta (fork Escale, Fase 5A). Gerente para cima. */
export async function POST(req: NextRequest): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!authz.ok) return authz.response;
  const lido = pastaSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) {
    return fail("validation_failed", traduzir("Falha na validação dos dados!", authz.user.idioma), 422, { requestId });
  }
  try {
    const { id } = await criarPasta(await createClient(), authz.org.orgId, lido.data);
    void audit({
      action: "automation.folder_created",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "automation_folder",
      resourceId: id,
      requestId,
      metadata: { nome: lido.data.nome },
    });
    return ok({ id }, { requestId, status: 201 });
  } catch (err) {
    console.error("[automacoes-da-casca] criar pasta", requestId, err);
    return fail("internal_error", traduzir("Erro inesperado.", authz.user.idioma), 500, { requestId });
  }
}
