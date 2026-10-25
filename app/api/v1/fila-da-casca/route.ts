import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { compilarFiltrosDaFila } from "@/lib/escale/conversas/compilar-filtros-da-fila";
import {
  LIMITE_DA_PAGINA_MAX,
  decodificarCursor,
  lerPaginaDaFila,
} from "@/lib/escale/conversas/fila-banco";
import { painelDoTexto } from "@/lib/escale/conversas/filtros-da-fila";
import { ordemDaUrl } from "@/lib/escale/conversas/ordem";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";
import { comNomeDoAtendente } from "@/lib/users/com-nome-do-atendente";

export const dynamic = "force-dynamic";
const LIMITE_PADRAO = 50;

/**
 * GET /api/v1/fila-da-casca — a fila de Conversas da casca (fork Escale, Fase 3D;
 * N9). O painel (`f`), a busca (`q`), a ordem (`o`) e o cursor; a RLS da sessão
 * decide o que cada pessoa vê. Mesma forma da lista do original.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const url = req.nextUrl.searchParams;
  const painel = painelDoTexto(url.get("f"));
  if (painel === null) return fail("validation_failed", t("Filtro inválido."), 422, { requestId });
  const cursorBruto = url.get("cursor");
  const cursor = decodificarCursor(cursorBruto);
  if (cursorBruto && !cursor)
    return fail("invalid_cursor", t("Cursor inválido."), 400, { requestId });
  const limite = Math.min(
    Math.max(Number(url.get("limit")) || LIMITE_PADRAO, 1),
    LIMITE_DA_PAGINA_MAX,
  );
  try {
    const supabase = await createClient();
    const compilado = compilarFiltrosDaFila(
      painel,
      url.get("q") ?? undefined,
      await fusoDaOrganizacao(supabase, authz.org.orgId, authz.org.timezone),
    );
    const pagina = await lerPaginaDaFila(
      supabase,
      authz.org.orgId,
      compilado,
      ordemDaUrl(url.get("o")),
      cursor,
      limite,
    );
    return ok(await comNomeDoAtendente(pagina.conversas), {
      requestId,
      meta: { cursor: pagina.cursor, has_more: pagina.has_more },
    });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
