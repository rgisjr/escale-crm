import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { criacaoDeNegocioSchema, lerCriacao } from "@/lib/escale/conversas/criacao-de-negocio";
import { destinosDasCondicoesValem } from "@/lib/escale/conversas/criacao-de-negocio-banco";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ channel_session_id: string }> };

/** A criação de negócio de um dispositivo (fork Escale, Fase 3E; F1). Todo membro lê; administrador grava. */
export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_criacao_de_negocio" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const canal = lerUuid((await ctx.params).channel_session_id);
  if (!canal) return fail("not_found", t("Dispositivo não encontrado."), 404, { requestId });
  const { data, error } = await (
    await createClient()
  )
    .from("crm_criacao_de_negocio")
    .select("ligado, regras")
    .eq("organization_id", authz.org.orgId)
    .eq("channel_session_id", canal)
    .maybeSingle();
  if (error) return fail("internal_error", error.message, 500, { requestId });
  return ok({ configurado: !!data, criacao: lerCriacao(data) }, { requestId });
}

export async function PUT(req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("admin", { requestId, resource: "crm_criacao_de_negocio" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const canal = lerUuid((await ctx.params).channel_session_id);
  if (!canal) return fail("not_found", t("Dispositivo não encontrado."), 404, { requestId });
  const lido = await lerJson(req);
  const parsed = criacaoDeNegocioSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success)
    return fail("validation_failed", t("Ocorreu um erro ao salvar."), 422, { requestId });
  const supabase = await createClient();
  const { data: dispositivo } = await supabase
    .from("channel_sessions")
    .select("id")
    .eq("organization_id", authz.org.orgId)
    .eq("id", canal)
    .maybeSingle();
  if (!dispositivo) return fail("not_found", t("Dispositivo não encontrado."), 404, { requestId });
  if (!(await destinosDasCondicoesValem(supabase, authz.org.orgId, parsed.data.regras)))
    return fail("validation_failed", t("Ocorreu um erro ao salvar."), 422, { requestId });
  const { error } = await supabase.from("crm_criacao_de_negocio").upsert(
    {
      channel_session_id: canal,
      organization_id: authz.org.orgId,
      ligado: parsed.data.ligado,
      regras: parsed.data.regras,
      atualizado_por: authz.user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "channel_session_id" },
  );
  if (error) return fail("internal_error", error.message, 500, { requestId });
  void audit({
    action: "channel_session.deal_creation_updated",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "channel_session",
    resourceId: canal,
    requestId,
    metadata: { ligado: parsed.data.ligado, condicoes: parsed.data.regras.length },
  });
  return ok({ criacao: parsed.data }, { requestId });
}
