import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, noContent } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ user_id: string }> };
const corpoSchema = z.object({ setor_ids: z.array(z.string().uuid()).max(100) });

/** "Setores" da aba Geral do usuário (c91): troca os setores da pessoa. A RLS exige "Editar ou excluir setores". */
export async function PUT(req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("admin", { requestId, resource: "team" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const userId = lerUuid((await ctx.params).user_id);
  if (!userId) return fail("not_found", t("Usuário não encontrado."), 404, { requestId });
  const lido = await lerJson(req);
  const parsed = corpoSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  const supabase = await createClient();
  const apagar = await supabase
    .from("crm_setores_membros")
    .delete()
    .eq("organization_id", authz.org.orgId)
    .eq("user_id", userId);
  if (apagar.error) return fail("internal_error", apagar.error.message, 500, { requestId });
  if (parsed.data.setor_ids.length > 0) {
    const inserir = await supabase
      .from("crm_setores_membros")
      .insert(
        [...new Set(parsed.data.setor_ids)].map((setor_id) => ({
          organization_id: authz.org.orgId,
          setor_id,
          user_id: userId,
        })),
      );
    if (inserir.error) {
      if (inserir.error.code === "23503")
        return fail("not_found", t("Setor não encontrado."), 404, { requestId });
      return fail("internal_error", inserir.error.message, 500, { requestId });
    }
  }
  return noContent(requestId);
}
