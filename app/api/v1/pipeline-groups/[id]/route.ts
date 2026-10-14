/**
 * PATCH/DELETE /api/v1/pipeline-groups/[id] — renomear e excluir um GRUPO DE
 * FUNIS (fork Escale, Fase 1A).
 *
 * Excluir NÃO apaga funil: a FK `crm_pipelines_group_fk` é `on delete set null
 * (group_id)` (migration 9001), então os funis do grupo voltam para "Sem grupo"
 * no mesmo comando. Grupo de outra organização morre no 404 antes de qualquer
 * escrita — a mesma resposta de um grupo inexistente (dizer "existe, mas não é
 * seu" já vaza a existência).
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { validarNomeDeGrupo } from "@/lib/escale/origens/regras";
import { lerJson, nomeRepetido, origensOuFalha, responderComOrigens } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const corpoSchema = z.object({ name: z.string().max(200) }).strict();

export async function PATCH(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipeline_groups" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = corpoSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("Dê um nome ao grupo."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }

  const supabase = await createClient();
  const antes = await origensOuFalha(supabase, orgId, requestId);
  if (!antes.ok) return antes.resposta;

  const grupo = antes.origens.grupos.find((g) => g.id === id);
  if (!grupo) return fail("not_found", t("Grupo não encontrado."), 404, { requestId });

  const veredito = validarNomeDeGrupo(parsed.data.name, antes.origens.grupos, id);
  if (!veredito.ok) return fail("unprocessable_entity", t(veredito.erro), 422, { requestId });

  const { error } = await supabase
    .from("crm_pipeline_groups")
    .update({ name: veredito.nome })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) return nomeRepetido(error, t, requestId) ?? fail("internal_error", error.message, 500, { requestId });

  void audit({
    action: "pipeline_group.renamed",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline_group",
    resourceId: id,
    requestId,
    metadata: { de: grupo.name, para: veredito.nome },
  });

  return responderComOrigens(supabase, orgId, requestId);
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipeline_groups" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;

  const supabase = await createClient();
  const antes = await origensOuFalha(supabase, orgId, requestId);
  if (!antes.ok) return antes.resposta;

  const grupo = antes.origens.grupos.find((g) => g.id === id);
  if (!grupo) return fail("not_found", t("Grupo não encontrado."), 404, { requestId });

  const { error } = await supabase
    .from("crm_pipeline_groups")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) return fail("internal_error", error.message, 500, { requestId });

  void audit({
    action: "pipeline_group.deleted",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline_group",
    resourceId: id,
    requestId,
    metadata: { name: grupo.name, funis: antes.origens.funis.filter((f) => f.group_id === id).length },
  });

  return responderComOrigens(supabase, orgId, requestId);
}
