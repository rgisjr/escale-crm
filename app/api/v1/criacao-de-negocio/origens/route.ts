import { randomUUID } from "node:crypto";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type Lida = {
  id: string;
  name: string;
  crm_stages: Array<{
    id: string;
    name: string;
    position: number | string;
    is_archived: boolean;
    is_won: boolean;
    is_lost: boolean;
  }> | null;
};

/** As origens e etapas que a condição oferece (N8): não arquivadas, sem ganho e perda, na ordem do quadro, pela sessão. */
export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const { data, error } = await (
    await createClient()
  )
    .from("crm_pipelines")
    .select("id, name, position, crm_stages(id, name, position, is_archived, is_won, is_lost)")
    .eq("organization_id", authz.org.orgId)
    .eq("is_archived", false)
    .order("position", { ascending: true });
  if (error) return fail("internal_error", error.message, 500, { requestId });
  return ok(
    ((data ?? []) as unknown as Lida[]).map((p) => ({
      id: p.id,
      nome: p.name,
      etapas: [...(p.crm_stages ?? [])]
        .filter((s) => !s.is_archived && !s.is_won && !s.is_lost)
        .sort((a, b) => Number(a.position) - Number(b.position))
        .map((s) => ({ id: s.id, nome: s.name })),
    })),
    { requestId },
  );
}
