/**
 * POST /api/v1/escale/tags — a tela de Tags da casca (fork Escale): cria a tag
 * ou grava a cor e a descrição dela, pela `fn_escale_tag_gravar` (9502).
 * Renomear e excluir seguem em POST /api/v1/tags/vocabulario.
 */
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { mfaEmDivida } from "@/lib/auth/server";
import { gravarTagSchema, type EntradaDeTag } from "@/lib/escale/tags/schema";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  const requestId = randomUUID();
  const auth = await requireRole("manager", { requestId, resource: "settings_tags" });
  if (!auth.ok) return auth.response;
  if (await mfaEmDivida())
    return fail("mfa_required", "Confirme a verificação em duas etapas.", 403, { requestId });

  const parsed = gravarTagSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("validation_failed", "Confira o nome, a cor e a descrição.", 422, {
      requestId,
      details: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const { tag, cor, descricao } = parsed.data;

  const db = await createClient();
  const { data, error } = await db.rpc("fn_escale_tag_gravar", {
    p_org: auth.org.orgId,
    p_tag: tag,
    p_cor: cor,
    p_descricao: descricao,
  });
  if (error) {
    if (error.code === "42501")
      return fail("forbidden", "Só um gerente ou administrador muda as tags.", 403, { requestId });
    if (error.code === "22023")
      return fail("validation_failed", "Confira o nome, a cor e a descrição.", 422, { requestId });
    return fail("internal_error", "Não foi possível salvar a tag.", 500, { requestId });
  }

  void audit({
    action: "tag_vocabulary.changed",
    actorUserId: auth.user.id,
    organizationId: auth.org.orgId,
    resourceType: "organization",
    resourceId: auth.org.orgId,
    requestId,
    metadata: { acao: "escale_gravar", tag, cor, descricao },
  });
  return ok(data as EntradaDeTag, { requestId });
}
