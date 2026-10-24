import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { lerResumoDasCampanhas } from "@/lib/escale/campanhas/banco";
import { PARAM_DOS_FILTROS, compilarFiltros, filtrosDoTexto } from "@/lib/escale/campanhas/filtros";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/v1/campanhas-da-casca/resumo — os 5 cartões do "Resumo das campanhas" (Fase 8A, N7). */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const filtros = filtrosDoTexto(req.nextUrl.searchParams.get(PARAM_DOS_FILTROS));
  if (filtros === null) return fail("validation_failed", t("Filtro inválido."), 422, { requestId });
  try {
    const supabase = await createClient();
    const fuso = await fusoDaOrganizacao(supabase, authz.org.orgId);
    return ok(
      await lerResumoDasCampanhas(supabase, authz.org.orgId, compilarFiltros(filtros, fuso)),
      { requestId },
    );
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
