import { randomUUID } from "node:crypto";

import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { lerOpcoesDaProspeccao } from "@/lib/escale/prospeccao/banco";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/prospeccao-da-casca/opcoes — chave, agentes, números e etapas (fork Escale, Fase 8D). */
export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("admin", { requestId, resource: "prospecting" });
  if (!authz.ok) return authz.response;
  try {
    return ok(await lerOpcoesDaProspeccao(getRequestPool(), authz.org.orgId), {
      requestId,
      headers,
    });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId, headers });
  }
}
