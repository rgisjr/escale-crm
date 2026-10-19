import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { compilarFiltrosDaFila } from "@/lib/escale/conversas/compilar-filtros-da-fila";
import { contarFila } from "@/lib/escale/conversas/fila-banco";
import { painelDoTexto } from "@/lib/escale/conversas/filtros-da-fila";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/v1/fila-da-casca/total — quantas conversas o painel alcança ("Selecionar todas as N", N12). */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const painel = painelDoTexto(req.nextUrl.searchParams.get("f"));
  if (painel === null) return fail("validation_failed", t("Filtro inválido."), 422, { requestId });
  try {
    const supabase = await createClient();
    const compilado = compilarFiltrosDaFila(
      painel,
      req.nextUrl.searchParams.get("q") ?? undefined,
      await fusoDaOrganizacao(supabase, authz.org.orgId),
    );
    return ok({ total: await contarFila(supabase, authz.org.orgId, compilado) }, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
