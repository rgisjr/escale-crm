import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { excluirEmpresa, lerFichaDaEmpresa, mudarCampoDaEmpresa, patchDaEmpresaSchema } from "@/lib/escale/empresas/banco";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { respostaDoErroDaEmpresa } from "../route";

export const dynamic = "force-dynamic";
const ROTA = "/api/v1/empresas/[id]";
type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "companies" });
  if (!authz.ok) return authz.response;
  const t = (s: string) => traduzir(s, authz.user.idioma);
  const { id } = await ctx.params;
  if (!UUID.test(id)) return fail("not_found", t("Empresa não encontrada"), 404, { requestId });
  try {
    return ok(await lerFichaDaEmpresa(await createClient(), authz.org.orgId, id));
  } catch (err) {
    return respostaDoErroDaEmpresa(err, t, requestId) ?? falhaInesperadaDoQuadro(err as { code?: string; message?: string }, { rota: ROTA, operacao: "ler" }, t, requestId);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("agent", { requestId, resource: "companies" });
  if (!authz.ok) return authz.response;
  const t = (s: string) => traduzir(s, authz.user.idioma);
  const { id } = await ctx.params;
  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = patchDaEmpresaSchema.safeParse(corpo.json);
  if (!lido.success) return fail("unprocessable_entity", t("Campo inválido."), 422, { requestId });
  try {
    await mudarCampoDaEmpresa(await createClient(), authz.org.orgId, id, lido.data);
    void audit({ action: "companies.updated_by_escale", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "companies", resourceId: id, requestId, metadata: { chave: lido.data.chave } });
    return ok({ id });
  } catch (err) {
    return respostaDoErroDaEmpresa(err, t, requestId) ?? falhaInesperadaDoQuadro(err as { code?: string; message?: string }, { rota: ROTA, operacao: "mudar" }, t, requestId);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "companies" });
  if (!authz.ok) return authz.response;
  const t = (s: string) => traduzir(s, authz.user.idioma);
  const { id } = await ctx.params;
  try {
    await excluirEmpresa(createAdminClient(), authz.org.orgId, id);
    void audit({ action: "companies.deleted_by_escale", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "companies", resourceId: id, requestId, metadata: {} });
    return ok({ id });
  } catch (err) {
    return respostaDoErroDaEmpresa(err, t, requestId) ?? falhaInesperadaDoQuadro(err as { code?: string; message?: string }, { rota: ROTA, operacao: "excluir" }, t, requestId);
  }
}
