import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { lerDetalheDaProspeccao } from "@/lib/escale/prospeccao/banco";
import { traduzir } from "@/lib/i18n/dicionario";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/prospeccao-da-casca/[id] — o detalhe de uma prospecção (fork Escale, Fase 8D). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("admin", { requestId, resource: "prospecting" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return fail("validation_failed", t("Query inválida."), 422, { requestId, headers });
  try {
    const detalhe = await lerDetalheDaProspeccao(getRequestPool(), authz.org.orgId, id);
    if (!detalhe)
      return fail("not_found", t("Prospecção não encontrada."), 404, { requestId, headers });
    return ok(detalhe, { requestId, headers });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId, headers });
  }
}
