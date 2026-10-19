import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { CHAVES_EDITAVEIS } from "@/lib/escale/conversas/permissoes";
import { pode } from "@/lib/escale/conversas/setores-banco";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** As chaves editáveis da pessoa da sessão (fn_crm_pode), para a tela mostrar ou não cada controle. */
export async function GET(_req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const supabase = await createClient();
  try {
    const pares = await Promise.all(
      [...CHAVES_EDITAVEIS].map(
        async (chave) => [chave, await pode(supabase, authz.org.orgId, chave)] as const,
      ),
    );
    return ok(Object.fromEntries(pares), { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
