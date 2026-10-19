import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { negociosDaEmpresa } from "@/lib/escale/empresas/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

import { respostaDoErroDaEmpresa } from "../../route";

export const dynamic = "force-dynamic";
const ROTA = "/api/v1/empresas/[id]/negocios";
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
    return ok(await negociosDaEmpresa(await createClient(), authz.org.orgId, id));
  } catch (err) {
    return respostaDoErroDaEmpresa(err, t, requestId) ?? falhaInesperadaDoQuadro(err as { code?: string; message?: string }, { rota: ROTA, operacao: "negocios" }, t, requestId);
  }
}
