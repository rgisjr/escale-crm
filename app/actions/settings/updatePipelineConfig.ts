"use server";

import { supportWriteError } from "@/lib/impersonate/support";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import {
  pipelineConfigPatchSchema,
  type PipelineConfigPatch,
} from "@/lib/schemas/settings";
import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";
import { podeAdministrarEmpresa } from "@/lib/auth/pode-administrar-empresa";
// FORK ESCALE · Fase 1F-a
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import { mesclaComOCatalogo } from "@/lib/escale/campos-do-crm/mescla-com-o-catalogo";

export type UpdatePipelineConfigResult =
  // FORK ESCALE · Fase 1F-a: `camposDesatualizados` só aparece quando a tela estava velha.
  | { ok: true; camposDesatualizados?: true }
  | { ok: false; error: string; details?: unknown };

/**
 * FORK ESCALE · Fase 1F-a: erros do Postgres que a pessoa resolve sozinha viram
 * um código estável (a tela o traduz). 40P01 (deadlock) e 40001 (serialização):
 * dois administradores editando os campos da mesma organização ao mesmo tempo.
 * 23514 do gatilho do catálogo: definição de campo inválida.
 */
function erroDoBanco(e: { message: string; code?: string }): string {
  if (e.code === "40P01" || e.code === "40001") return "campos_em_conflito";
  if (e.code === "23514" && e.message.includes("campo do CRM")) return "campo_invalido";
  return e.message;
}

export async function updatePipelineConfig(
  pipelineId: string,
  patch: PipelineConfigPatch,
): Promise<UpdatePipelineConfigResult> {
  if (!pipelineId || typeof pipelineId !== "string") {
    return { ok: false, error: "invalid_request" };
  }
  const parsed = pipelineConfigPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: "validation_failed", details: parsed.error.flatten() };
  }

  const authUser = await loadAuthUser();
  if (!authUser) return { ok: false, error: "unauthenticated" };
  if (supportWriteError(authUser.support)) return { ok: false, error: "forbidden" };
  const activeOrg = await resolveActiveOrg(authUser);
  if (!activeOrg) return { ok: false, error: "forbidden_tenant" };
  if (!podeAdministrarEmpresa(authUser, activeOrg)) {
    return { ok: false, error: "forbidden_role" };
  }

  const supabase = await createClient();
  const hdrs = await headers();
  const requestId = hdrs.get("x-request-id");

  const { data: row, error: readErr } = await supabase
    .from("crm_pipelines")
    .select("vocabulary, settings, organization_id")
    .eq("id", pipelineId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!row) return { ok: false, error: "not_found" };
  if (row.organization_id !== activeOrg.orgId) {
    return { ok: false, error: "forbidden_tenant" };
  }

  // FORK ESCALE · Fase 1F-a: tela velha não desfaz o que outro administrador mudou.
  // Sem `campos_carregados` (captação, API) vale `fields` como veio.
  let camposParaGravar = parsed.data.fields;
  let camposDesatualizados = false;
  if (camposParaGravar !== undefined && parsed.data.campos_carregados !== undefined) {
    const mescla = mesclaComOCatalogo({
      enviados: camposParaGravar,
      carregados: parsed.data.campos_carregados,
      atuais: camposDoFunil(row.settings as Record<string, unknown> | null),
    });
    camposParaGravar = mescla.fields;
    camposDesatualizados = mescla.desatualizado;
  }

  const nextVocabulary = parsed.data.vocabulary
    ? { ...((row.vocabulary as Record<string, unknown> | null) ?? {}), ...parsed.data.vocabulary }
    : ((row.vocabulary as Record<string, unknown> | null) ?? {});

  const currentSettings = (row.settings as Record<string, unknown> | null) ?? {};
  const nextSettings: Record<string, unknown> = { ...currentSettings };
  if (camposParaGravar !== undefined) nextSettings.fields = camposParaGravar; // FORK ESCALE · Fase 1F-a
  if (parsed.data.lost_reasons !== undefined) nextSettings.lost_reasons = parsed.data.lost_reasons;
  if (parsed.data.won_reasons !== undefined) nextSettings.won_reasons = parsed.data.won_reasons;
  if (parsed.data.won_reason_required !== undefined) {
    nextSettings.won_reason_required = parsed.data.won_reason_required;
  }
  if (parsed.data.comanda_no_ganho !== undefined) {
    nextSettings.comanda_no_ganho = parsed.data.comanda_no_ganho;
  }
  if (parsed.data.reabertura !== undefined) nextSettings.reabertura = parsed.data.reabertura;
  if (parsed.data.reabertura_campos !== undefined) {
    nextSettings.reabertura_campos = parsed.data.reabertura_campos;
  }

  // FORK ESCALE · Fase 1F-a: os campos são do CRM. Remover na tela apaga do
  // catálogo, e o gatilho da 9006 tira o campo e a regra dele do
  // `settings.fields` de todas as origens (como na Clint: "A exclusão desse
  // campo remove em toda origem.").
  const camposRemovidos = parsed.data.campos_removidos ?? [];
  if (camposRemovidos.length > 0) {
    const { error: erroAoApagar } = await supabase
      .from("crm_campos_do_negocio")
      .delete()
      .eq("organization_id", activeOrg.orgId)
      .in("chave", camposRemovidos);
    if (erroAoApagar) return { ok: false, error: erroDoBanco(erroAoApagar) };
  }

  const { error } = await supabase
    .from("crm_pipelines")
    .update({ vocabulary: nextVocabulary, settings: nextSettings })
    .eq("id", pipelineId);
  if (error) return { ok: false, error: erroDoBanco(error) };

  await audit({
    action: "pipeline.config_updated",
    actorUserId: authUser.id,
    organizationId: activeOrg.orgId,
    resourceType: "pipeline",
    resourceId: pipelineId,
    requestId,
    metadata: {
      vocabulary_changed: !!parsed.data.vocabulary,
      fields_count: parsed.data.fields?.length ?? null,
      lost_reasons_count: parsed.data.lost_reasons?.length ?? null,
      won_reasons_count: parsed.data.won_reasons?.length ?? null,
      won_reason_required: parsed.data.won_reason_required ?? null,
      reabertura: parsed.data.reabertura ?? null,
      // FORK ESCALE · Fase 1F-a
      campos_removidos: camposRemovidos.length > 0 ? camposRemovidos : null,
      campos_desatualizados: camposDesatualizados ? true : null,
    },
  });

  revalidatePath("/app/settings/tenant/pipelines");
  return camposDesatualizados ? { ok: true, camposDesatualizados: true } : { ok: true };
}
