import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { carregarCampanha } from "@/lib/campanhas/acoes";
import { reagendarAcao, voltarAoRascunhoAcao } from "@/lib/escale/campanhas/acoes";
import {
  duplicarDoAssistente,
  enviarDoAssistente,
  prepararDoAssistente,
} from "@/lib/escale/campanhas/acoes-do-assistente";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ACOES = ["reagendar", "rascunho", "preparar", "enviar", "duplicar"] as const;
type Acao = (typeof ACOES)[number];
const reagendarSchema = z.object({ scheduled_at: z.string().datetime() });

/**
 * POST /api/v1/campanhas-da-casca/:id/:acao (fork Escale). Fase 8A: reagendar e
 * rascunho; Fase 8B: preparar, enviar e duplicar (o assistente). Gerente e
 * client admin, como as ações do original: `authenticated` só tem SELECT em
 * `campaigns` (0375). A organização vem do papel, nunca do corpo.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; acao: string }> },
): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id, acao: bruta } = await ctx.params;
  if (!(ACOES as readonly string[]).includes(bruta)) {
    return fail("not_found", t("Ação de campanha desconhecida."), 404, { requestId });
  }
  const acao = bruta as Acao;
  try {
    const admin = createAdminClient();
    const carregada = await carregarCampanha(admin, authz.org.orgId, id);
    if (!carregada.ok)
      return fail(carregada.codigo, t(carregada.mensagem), carregada.status, { requestId });
    const campanha = carregada.campanha;
    const base = {
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "campaign",
      resourceId: id,
      requestId,
    } as const;
    const agora = new Date();

    switch (acao) {
      case "reagendar": {
        const lido = reagendarSchema.safeParse(await req.json().catch(() => null));
        if (!lido.success)
          return fail("validation_failed", t("Informe a nova data e hora do disparo."), 422, {
            requestId,
          });
        const r = await reagendarAcao(admin, campanha, new Date(lido.data.scheduled_at), agora);
        if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
        void audit({
          ...base,
          action: "campaign.rescheduled",
          metadata: { scheduled_at: r.scheduled_at },
        });
        return ok({ scheduled_at: r.scheduled_at }, { requestId });
      }
      case "rascunho": {
        const r = await voltarAoRascunhoAcao(admin, campanha);
        if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
        void audit({
          ...base,
          action: "campaign.back_to_draft",
          metadata: { de: campanha.status },
        });
        return ok({ status: "draft" }, { requestId });
      }
      case "preparar": {
        const r = await prepararDoAssistente(admin, campanha, agora);
        if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
        void audit({
          ...base,
          action: "campaign.prepared",
          metadata: {
            total: r.resumo.total,
            elegiveis: r.resumo.elegiveis,
            excluidos: r.resumo.excluidos,
            via: "assistente",
          },
        });
        return ok({ resumo: r.resumo }, { requestId });
      }
      case "enviar": {
        const r = await enviarDoAssistente(admin, campanha, agora);
        if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
        void audit({
          ...base,
          action: r.modo === "agendada" ? "campaign.scheduled" : "campaign.started",
          metadata: { via: "assistente", ...(r.quando ? { scheduled_at: r.quando } : {}) },
        });
        return ok({ modo: r.modo, quando: r.quando }, { requestId });
      }
      case "duplicar": {
        const r = await duplicarDoAssistente(admin, campanha, authz.user.id);
        if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
        void audit({
          ...base,
          action: "campaign.duplicated",
          metadata: { copia: r.id, via: "assistente" },
        });
        return ok({ id: r.id }, { requestId });
      }
    }
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
