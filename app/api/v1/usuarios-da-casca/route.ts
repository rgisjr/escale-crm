import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * O que a lista "Usuários e Permissões" (c40) precisa além do `/api/v1/team`
 * do original: os setores de cada pessoa (a aba Geral) e se ela tem exceção
 * ("Personalizado" na coluna PERMISSÕES DE ATENDIMENTO).
 */
export async function GET(_req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("admin", { requestId, resource: "team" });
  if (!authz.ok) return authz.response;
  const supabase = await createClient();
  const [membros, excecoes] = await Promise.all([
    supabase
      .from("crm_setores_membros")
      .select("user_id, setor_id")
      .eq("organization_id", authz.org.orgId),
    supabase
      .from("crm_permissoes_de_atendimento")
      .select("user_id, chave")
      .eq("organization_id", authz.org.orgId),
  ]);
  if (membros.error) return fail("internal_error", membros.error.message, 500, { requestId });
  if (excecoes.error) return fail("internal_error", excecoes.error.message, 500, { requestId });
  const saida: Record<string, { setores: string[]; excecoes: number }> = {};
  const de = (id: string) => (saida[id] ??= { setores: [], excecoes: 0 });
  for (const m of (membros.data ?? []) as Array<{ user_id: string; setor_id: string }>)
    de(m.user_id).setores.push(m.setor_id);
  for (const e of (excecoes.data ?? []) as Array<{ user_id: string }>) de(e.user_id).excecoes += 1;
  return ok(saida, { requestId });
}
