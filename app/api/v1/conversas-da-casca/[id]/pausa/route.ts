import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, noContent, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { lerJson } from "@/lib/escale/origens/respostas";
import { pausaEnrollment, retomaEnrollment } from "@/lib/followup/intervencao";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

import { comAConversa } from "../_comum";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
const corpoSchema = z.object({ ate: z.string().datetime().nullable() });
const SILENCIO_DURAVEL = "infinity";
const ATIVOS = ["active", "waiting_reply"] as const;

interface PausaLida {
  conversation_id: string;
  ate: string | null;
  user_id: string;
  enrollments: string[];
  created_at: string;
}
interface EnrollmentLido {
  id: string;
  status: string;
  next_eval_at: string | null;
}

async function enrollmentsAtivos(
  supabase: Parameters<typeof pausaEnrollment>[0]["supabase"],
  orgId: string,
  conversationId: string,
): Promise<EnrollmentLido[]> {
  const { data, error } = await supabase
    .from("followup_enrollments")
    .select("id, status, next_eval_at")
    .eq("organization_id", orgId)
    .eq("conversation_id", conversationId)
    .in("status", [...ATIVOS]);
  if (error) throw error;
  return (data ?? []) as EnrollmentLido[];
}

/** O estado do cartão "Pausar automação" (D4): a pausa, se o agente está de pé, os follow-ups. */
export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, async ({ authz, supabase, conversa, requestId }) => {
    const { data: pausa } = await supabase
      .from("crm_pausas_de_automacao")
      .select("conversation_id, ate, user_id, enrollments, created_at")
      .eq("conversation_id", conversa.id)
      .maybeSingle();
    const ativos = await enrollmentsAtivos(supabase, authz.org.orgId, conversa.id);
    const proximoEm =
      ativos
        .map((e) => e.next_eval_at)
        .filter((x): x is string => !!x)
        .sort()[0] ?? null;
    const silenciado =
      conversa.bot_silenced_until !== null &&
      (conversa.bot_silenced_until === SILENCIO_DURAVEL ||
        Date.parse(conversa.bot_silenced_until) > Date.now());
    return ok(
      {
        pausa: (pausa as PausaLida | null) ?? null,
        agenteAtivo: !silenciado,
        followups: { ativos: ativos.length, proximoEm },
      },
      { requestId },
    );
  });
}

/** "Pausar" (todas por um prazo, até retomar, ou data e hora). */
export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  return comAConversa(ctx.params, async ({ authz, supabase, conversa, requestId, t }) => {
    const lido = await lerJson(req);
    const parsed = corpoSchema.safeParse(lido.ok ? lido.json : null);
    if (!parsed.success)
      return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
    const ate = parsed.data.ate;
    if (ate && Date.parse(ate) <= Date.now()) {
      return fail(
        "validation_failed",
        t("Não é possível agendar para uma data/hora no passado"),
        422,
        { requestId },
      );
    }
    const { error } = await supabase
      .from("conversations")
      .update({ bot_silenced_until: ate ?? SILENCIO_DURAVEL })
      .eq("organization_id", authz.org.orgId)
      .eq("id", conversa.id);
    if (error) throw error;

    const ativos = await enrollmentsAtivos(supabase, authz.org.orgId, conversa.id);
    const deps = {
      supabase,
      admin: createAdminClient(),
      orgId: authz.org.orgId,
      userId: authz.user.id,
      requestId,
    };
    const pausados: string[] = [];
    for (const e of ativos) {
      const r = await pausaEnrollment(deps, e.id);
      if (r.ok) pausados.push(e.id);
      else
        logger.warn("escale/pausa: follow-up não pausado", {
          enrollment: e.id,
          conversation_id: conversa.id,
        });
    }
    const pausa = {
      conversation_id: conversa.id,
      organization_id: authz.org.orgId,
      ate,
      user_id: authz.user.id,
      enrollments: pausados,
    };
    const { error: erroDaPausa } = await supabase
      .from("crm_pausas_de_automacao")
      .upsert(pausa, { onConflict: "conversation_id" });
    if (erroDaPausa) throw erroDaPausa;
    void audit({
      action: "conversation.automation_paused",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "conversation",
      resourceId: conversa.id,
      requestId,
      metadata: { ate, followups: pausados.length },
    });
    return ok({ pausa }, { requestId });
  });
}

/** "Retomar". */
export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  return comAConversa(ctx.params, async ({ authz, supabase, conversa, requestId }) => {
    const { data } = await supabase
      .from("crm_pausas_de_automacao")
      .select("conversation_id, ate, user_id, enrollments, created_at")
      .eq("conversation_id", conversa.id)
      .maybeSingle();
    const pausa = data as PausaLida | null;
    const { error } = await supabase
      .from("conversations")
      .update({ bot_silenced_until: null })
      .eq("organization_id", authz.org.orgId)
      .eq("id", conversa.id);
    if (error) throw error;
    const deps = {
      supabase,
      admin: createAdminClient(),
      orgId: authz.org.orgId,
      userId: authz.user.id,
      requestId,
    };
    for (const id of pausa?.enrollments ?? []) {
      const r = await retomaEnrollment(deps, id);
      if (!r.ok)
        logger.warn("escale/pausa: follow-up não retomado", {
          enrollment: id,
          conversation_id: conversa.id,
        });
    }
    await supabase.from("crm_pausas_de_automacao").delete().eq("conversation_id", conversa.id);
    void audit({
      action: "conversation.automation_resumed",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "conversation",
      resourceId: conversa.id,
      requestId,
    });
    return noContent(requestId);
  });
}
