import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { tornarTemplate } from "@/lib/escale/indicadores/modelos/banco";
import { lerPainel } from "@/lib/escale/indicadores/paineis/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/indicadores-da-casca/paineis/:id/tornar-template — copia o painel e os gráficos como template
 * visível a toda a organização (fork Escale, Fase 7F, U8). Gerente para cima.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return fail("not_found", t("Dashboard não encontrado."), 404, { requestId });
  try {
    const supabase = await createClient();
    const painel = await lerPainel(supabase, authz.org.orgId, id, false);
    if (!painel) return fail("not_found", t("Dashboard não encontrado."), 404, { requestId });
    const novo = await tornarTemplate(supabase, authz.org.orgId, authz.user.id, painel);
    void audit({
      action: "dashboard.template_created",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "dashboard",
      resourceId: novo.id,
      requestId,
      metadata: { origem: id },
    });
    return ok({ id: novo.id }, { requestId, status: 201 });
  } catch (err) {
    logger.error("indicadores.template_criacao_falhou", { requestId, motivo: (err as Error).message });
    return fail("internal_error", t("Falha na criação do template."), 500, { requestId });
  }
}
