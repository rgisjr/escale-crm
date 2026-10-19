/** POST /api/v1/importacoes/[id]/cancelar — cancelar a importação na fila ou importando (fork Escale, Fase 2F). Gerente ou acima. */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { ErroDaImportacao, cancelarImportacao, lerImportacao } from "@/lib/escale/importacao/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await params;
  try {
    const importacao = /^[0-9a-f-]{36}$/i.test(id) ? await lerImportacao(await createClient(), authz.org.orgId, id) : null;
    if (!importacao) return fail("not_found", t("Importação não encontrada."), 404, { requestId });
    await cancelarImportacao(createAdminClient(), id);
    void audit({
      action: "contacts.import_canceled",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "crm_importacao",
      resourceId: id,
      requestId,
      metadata: {},
    });
    return ok({ status: "cancelada" });
  } catch (err) {
    if (err instanceof ErroDaImportacao) return fail("conflict", t(err.message), 409, { requestId });
    return falhaInesperadaDoQuadro(err as { code?: string; message?: string }, { rota: "/api/v1/importacoes/[id]/cancelar", operacao: "cancelar" }, t, requestId);
  }
}
