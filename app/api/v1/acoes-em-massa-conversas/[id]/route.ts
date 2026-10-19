import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import type { ResumoDaAcaoDaFila } from "@/lib/escale/conversas/acoes-em-massa-da-fila";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/v1/acoes-em-massa-conversas/[id] — o andamento da MINHA ação (a RLS só mostra as minhas). */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_acoes_em_massa_conversas" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const id = lerUuid((await ctx.params).id);
  if (!id) return fail("not_found", t("Ação não encontrada."), 404, { requestId });
  const { data, error } = await (
    await createClient()
  )
    .from("crm_acoes_em_massa_conversas")
    .select("id, acao, status, total, feitos, falhas")
    .eq("organization_id", authz.org.orgId)
    .eq("id", id)
    .maybeSingle();
  if (error) return fail("internal_error", error.message, 500, { requestId });
  if (!data) return fail("not_found", t("Ação não encontrada."), 404, { requestId });
  return ok(data as ResumoDaAcaoDaFila, { requestId });
}
