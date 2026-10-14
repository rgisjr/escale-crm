/**
 * PUT /api/v1/pipelines/[id]/grupo — põe o funil num GRUPO DE FUNIS (fork
 * Escale, Fases 1A e 1B). Toda origem tem grupo (migration 9002): `group_id` é
 * obrigatório e precisa ser um grupo ATIVO da organização da sessão.
 *
 * Arquivo NOVO de propósito, e não um campo a mais no PATCH do funil
 * (`../route.ts`): aquele schema é `.strict()` e é do original. A guarda de
 * organização é dupla: a rota só aceita funil e grupo da leitura da organização
 * da sessão, e o banco recusa a combinação cruzada pela FK composta.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { lerJson, origensOuFalha, responderComOrigens } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const corpoSchema = z.object({ group_id: z.string().uuid() }).strict();

export async function PUT(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const { id: funilId } = await ctx.params;

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = corpoSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("Escolha um grupo válido para o funil."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }
  const para = parsed.data.group_id;

  const supabase = await createClient();
  const antes = await origensOuFalha(supabase, orgId, requestId);
  if (!antes.ok) return antes.resposta;

  const funil = antes.origens.funis.find((f) => f.id === funilId);
  if (!funil) return fail("not_found", t("Funil não encontrado."), 404, { requestId });
  if (!antes.origens.grupos.some((g) => g.id === para && !g.is_archived)) {
    return fail("not_found", t("Grupo não encontrado."), 404, { requestId });
  }
  // Nada a mudar: sem escrita e sem linha de auditoria que não aconteceu.
  if (funil.group_id === para) return ok(antes.origens, { requestId });

  const { error } = await supabase
    .from("crm_pipelines")
    .update({ group_id: para })
    .eq("id", funilId)
    .eq("organization_id", orgId);
  if (error) {
    // 23503 = a FK composta recusou: o grupo sumiu entre a leitura e a escrita.
    if (error.code === "23503") return fail("not_found", t("Grupo não encontrado."), 404, { requestId });
    return fail("internal_error", error.message, 500, { requestId });
  }

  void audit({
    action: "pipeline.group_changed",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline",
    resourceId: funilId,
    requestId,
    metadata: { de: funil.group_id, para },
  });

  return responderComOrigens(supabase, orgId, requestId);
}
