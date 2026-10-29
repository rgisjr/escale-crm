import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { ErroDoModelo, excluirTemplate } from "@/lib/escale/indicadores/modelos/banco";
import { FalhaDoPainel } from "@/lib/escale/indicadores/paineis/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** DELETE /api/v1/indicadores-da-casca/modelos/:id — exclui um template da organização (fork Escale, Fase 7F, U9). Gerente para cima. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const naoEncontrado = () => fail("not_found", t("Template não encontrado. Recarregue e tente novamente."), 404, { requestId });
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return naoEncontrado();
  try {
    await excluirTemplate(await createClient(), authz.org.orgId, id);
    void audit({
      action: "dashboard.template_deleted",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "dashboard",
      resourceId: id,
      requestId,
    });
    return ok({ id }, { requestId });
  } catch (err) {
    if (err instanceof ErroDoModelo && err.motivo === "nao_encontrado") return naoEncontrado();
    if (err instanceof FalhaDoPainel && err.codigo === "nao_encontrado") return naoEncontrado();
    if (err instanceof FalhaDoPainel && err.codigo === "sem_permissao") {
      return fail("forbidden", t("Falha na exclusão do template."), 403, { requestId });
    }
    logger.error("indicadores.template_exclusao_falhou", { requestId, motivo: (err as Error).message });
    return fail("internal_error", t("Falha na exclusão do template."), 500, { requestId });
  }
}
