import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { carregarCampanha } from "@/lib/campanhas/acoes";
import { excluirRascunhoAcao } from "@/lib/escale/campanhas/acoes";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** DELETE /api/v1/campanhas-da-casca/:id — "Excluir rascunho" da Clint (fork Escale, Fase 8A; N10). */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  try {
    const admin = createAdminClient();
    const carregada = await carregarCampanha(admin, authz.org.orgId, id);
    if (!carregada.ok)
      return fail(carregada.codigo, t(carregada.mensagem), carregada.status, { requestId });
    const r = await excluirRascunhoAcao(admin, carregada.campanha);
    if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
    void audit({
      action: "campaign.draft_deleted",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "campaign",
      resourceId: id,
      requestId,
      metadata: {},
    });
    return ok({ id }, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
