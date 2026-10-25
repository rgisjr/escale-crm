import { randomUUID } from "node:crypto";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { filaTemGrupos } from "@/lib/escale/conversas/fila-banco";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/v1/fila-da-casca/tem-grupos — existe conversa de grupo na fila? (mostra o preset e a seção de grupos; Q7c). */
export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  try {
    const supabase = await createClient();
    return ok({ temGrupos: await filaTemGrupos(supabase, authz.org.orgId) }, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
