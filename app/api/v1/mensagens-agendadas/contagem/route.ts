import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const IDS_MAX = 60;

/** O "⏱ n" da linha da fila (c59) e o contador da ação rápida: pendentes por conversa, de uma vez por página. */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const ids = (new URL(req.url).searchParams.get("conversation_ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (
    ids.length === 0 ||
    ids.length > IDS_MAX ||
    ids.some((id) => !lerUuid(id) && !/^[\w-]+$/.test(id))
  ) {
    return fail("validation_failed", "conversation_ids inválido", 422, { requestId });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_mensagens_agendadas")
    .select("conversation_id")
    .eq("organization_id", authz.org.orgId)
    .eq("status", "pendente")
    .in("conversation_id", ids);
  if (error) return fail("internal_error", error.message, 500, { requestId });
  const contagem: Record<string, number> = {};
  for (const l of (data ?? []) as Array<{ conversation_id: string }>) {
    contagem[l.conversation_id] = (contagem[l.conversation_id] ?? 0) + 1;
  }
  return ok(contagem, { requestId });
}
