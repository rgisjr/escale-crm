import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { assistenteSchema } from "@/lib/escale/campanhas/assistente";
import { lerAssistente, salvarRascunho } from "@/lib/escale/campanhas/rascunho";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/v1/campanhas-da-casca/:id/assistente — a campanha no formato do assistente (fork Escale, Fase 8B). */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!UUID.test(id))
    return fail("campanha_nao_encontrada", t("Campanha não encontrada."), 404, { requestId });
  try {
    const dados = await lerAssistente(
      await createClient(),
      createAdminClient(),
      authz.org.orgId,
      id,
    );
    if (!dados)
      return fail("campanha_nao_encontrada", t("Campanha não encontrada."), 404, { requestId });
    return ok(dados, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}

/** PUT /api/v1/campanhas-da-casca/:id/assistente — salva o rascunho (só `draft`; N14). */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!UUID.test(id))
    return fail("campanha_nao_encontrada", t("Campanha não encontrada."), 404, { requestId });
  const lido = assistenteSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) {
    return fail("validation_failed", t("Dados inválidos."), 422, {
      requestId,
      details: lido.error.flatten().fieldErrors as Record<string, unknown>,
    });
  }
  try {
    const r = await salvarRascunho(
      createAdminClient(),
      authz.org.orgId,
      authz.user.id,
      id,
      lido.data,
    );
    if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
    void audit({
      action: "campaign.wizard_saved",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "campaign",
      resourceId: id,
      requestId,
      metadata: { mensagem: lido.data.mensagem.tipo },
    });
    return ok({ id }, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
