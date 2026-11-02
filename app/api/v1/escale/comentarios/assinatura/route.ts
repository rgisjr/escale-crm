/**
 * POST /api/v1/escale/comentarios/assinatura — garante que o webhook do canal recebe `comment.received`
 * (canais antigos não assinavam o evento). Chamada ao escolher a conta no painel do gatilho (fork
 * Escale, Fase 10B).
 */
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { SocialError } from "@/lib/channels/social/client";
import { garantirAssinaturaDeComentarios } from "@/lib/escale/comentarios/assinatura";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const corpoSchema = z.object({ canal: z.string().uuid() });

export async function POST(req: NextRequest): Promise<Response> {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  const requestId = randomUUID();
  const auth = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!auth.ok) return auth.response;

  const corpo = corpoSchema.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return fail("validation_failed", "Falha na validação dos dados!", 422, { requestId });

  try {
    const estado = await garantirAssinaturaDeComentarios(createAdminClient(), auth.org.orgId, corpo.data.canal);
    if (estado === "assinada") {
      void audit({
        action: "automation.comment_subscription_ensured",
        actorUserId: auth.user.id,
        organizationId: auth.org.orgId,
        resourceType: "channel_session",
        resourceId: null,
        requestId,
        metadata: { evento: "comment.received", canal: corpo.data.canal },
      });
    }
    return ok({ estado }, { requestId });
  } catch (err) {
    if (err instanceof SocialError) return fail("assinatura_falhou", err.message, err.status, { requestId });
    console.error("[escale-comentarios] assinatura", requestId, err);
    return fail("internal_error", "Erro inesperado.", 500, { requestId });
  }
}
