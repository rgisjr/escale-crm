import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { autorizaCron } from "@/lib/auth/cron-auth";
import { retomaEnrollment } from "@/lib/followup/intervencao";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const LOTE = 100;

/**
 * FORK ESCALE · Fase 3B (D4): as pausas de automação com prazo vencido são
 * retomadas pelo sistema — `bot_silenced_until` já venceu sozinho (o motor
 * compara com now()); aqui só os follow-ups voltam e a linha da pausa sai.
 * Agendado no docker/scheduler/entrypoint.sh (a cada 5 min).
 */
async function handle(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  if (!autorizaCron(req))
    return fail("forbidden", "Cron secret missing or invalid.", 403, { requestId });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crm_pausas_de_automacao")
    .select("conversation_id, organization_id, user_id, enrollments")
    .not("ate", "is", null)
    .lte("ate", new Date().toISOString())
    .limit(LOTE);
  if (error) return fail("internal_error", error.message, 500, { requestId });
  let retomadas = 0;
  for (const p of (data ?? []) as Array<{
    conversation_id: string;
    organization_id: string;
    user_id: string;
    enrollments: string[];
  }>) {
    const deps = { supabase: admin, admin, orgId: p.organization_id, userId: p.user_id, requestId };
    for (const id of p.enrollments ?? []) {
      const r = await retomaEnrollment(deps, id);
      if (!r.ok)
        logger.warn("cron pausas: follow-up não retomado", {
          enrollment: id,
          conversation_id: p.conversation_id,
        });
    }
    await admin.from("crm_pausas_de_automacao").delete().eq("conversation_id", p.conversation_id);
    retomadas++;
  }
  return ok({ retomadas }, { requestId });
}

export async function GET(req: NextRequest): Promise<Response> {
  return handle(req);
}
export async function POST(req: NextRequest): Promise<Response> {
  return handle(req);
}
