import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { desvincularContato } from "@/lib/escale/empresas/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { respostaDoErroDaEmpresa } from "../../../route";

export const dynamic = "force-dynamic";
const ROTA = "/api/v1/empresas/[id]/contatos/[contatoId]";
type Ctx = { params: Promise<{ id: string; contatoId: string }> };
const UUID = z.string().uuid();

export async function DELETE(req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("agent", { requestId, resource: "companies" });
  if (!authz.ok) return authz.response;
  const t = (s: string) => traduzir(s, authz.user.idioma);
  const { id, contatoId } = await ctx.params;
  const bruto = req.nextUrl.searchParams.get("novo_principal");
  const novo = bruto ? UUID.safeParse(bruto) : null;
  if (!UUID.safeParse(id).success || !UUID.safeParse(contatoId).success || (novo && !novo.success)) {
    return fail("unprocessable_entity", t("Consulta inválida."), 422, { requestId });
  }
  try {
    const desfecho = await desvincularContato(createAdminClient(), authz.org.orgId, id, contatoId, novo?.success ? novo.data : null);
    void audit({
      action: "companies.contact_unlinked",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "companies",
      resourceId: id,
      requestId,
      metadata: { contato_id: contatoId, desfecho },
    });
    return ok({ desfecho });
  } catch (err) {
    return respostaDoErroDaEmpresa(err, t, requestId) ?? falhaInesperadaDoQuadro(err as { code?: string; message?: string }, { rota: ROTA, operacao: "desvincular" }, t, requestId);
  }
}
