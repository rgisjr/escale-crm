import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { empresaDoContato, trocarEmpresaDoContato, trocarEmpresaDoContatoSchema } from "@/lib/escale/empresas/banco";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { respostaDoErroDaEmpresa } from "../../../empresas/route";

export const dynamic = "force-dynamic";
const ROTA = "/api/v1/contatos/[id]/empresa";
type Ctx = { params: Promise<{ id: string }> };
const UUID = z.string().uuid();

export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "companies" });
  if (!authz.ok) return authz.response;
  const t = (s: string) => traduzir(s, authz.user.idioma);
  const { id } = await ctx.params;
  if (!UUID.safeParse(id).success) return fail("not_found", t("Contato não encontrado."), 404, { requestId });
  try {
    return ok(await empresaDoContato(await createClient(), authz.org.orgId, id));
  } catch (err) {
    return respostaDoErroDaEmpresa(err, t, requestId) ?? falhaInesperadaDoQuadro(err as { code?: string; message?: string }, { rota: ROTA, operacao: "ler" }, t, requestId);
  }
}

export async function PUT(req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("agent", { requestId, resource: "companies" });
  if (!authz.ok) return authz.response;
  const t = (s: string) => traduzir(s, authz.user.idioma);
  const { id } = await ctx.params;
  if (!UUID.safeParse(id).success) return fail("not_found", t("Contato não encontrado."), 404, { requestId });
  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = trocarEmpresaDoContatoSchema.safeParse(corpo.json);
  if (!lido.success) {
    return fail("unprocessable_entity", t("Escolha a empresa ou digite um nome novo"), 422, { requestId });
  }
  try {
    const empresa = await trocarEmpresaDoContato(await createClient(), createAdminClient(), authz.org.orgId, authz.user.id, id, lido.data);
    void audit({
      action: "companies.contact_linked",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "contacts",
      resourceId: id,
      requestId,
      metadata: { contato_id: id, modo: "nova" in lido.data ? "nova" : lido.data.empresa_id === null ? "remover" : "existente" },
    });
    return ok(empresa);
  } catch (err) {
    return respostaDoErroDaEmpresa(err, t, requestId) ?? falhaInesperadaDoQuadro(err as { code?: string; message?: string }, { rota: ROTA, operacao: "trocar" }, t, requestId);
  }
}
