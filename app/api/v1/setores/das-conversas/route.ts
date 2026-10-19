import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { setoresDasConversas } from "@/lib/escale/conversas/setores-banco";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const IDS_MAX = 60;

/** O setor de cada conversa de uma página da fila (N16): o chip da linha, o selo do cabeçalho. */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0 || ids.length > IDS_MAX || ids.some((id) => !lerUuid(id))) {
    return fail("validation_failed", "ids inválido", 422, { requestId });
  }
  try {
    return ok(await setoresDasConversas(await createClient(), authz.org.orgId, ids), { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
