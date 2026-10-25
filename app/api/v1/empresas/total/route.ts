/**
 * GET /api/v1/empresas/total — quantas empresas a consulta da lista devolve (fork Escale,
 * Q7d; função 9406). Mesmos `q`, `e` e `f` da página, sem `p` nem `n`: o cliente pede uma
 * vez por filtro e reaproveita nas trocas de página.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { filtrosDaConsulta } from "@/lib/escale/contatos/lista";
import { totalDeEmpresas } from "@/lib/escale/empresas/banco";
import { consultaDaListaDeEmpresasSchema } from "@/lib/escale/empresas/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "companies" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const consulta = consultaDaListaDeEmpresasSchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!consulta.success || filtrosDaConsulta({ f: consulta.data.f }) === null) {
    return fail("unprocessable_entity", t("Consulta inválida."), 422, { requestId });
  }
  try {
    const total = await totalDeEmpresas(await createClient(), authz.org.orgId, consulta.data);
    return ok({ total }, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "GET /api/v1/empresas/total", operacao: "contar" },
      t,
      requestId,
    );
  }
}
