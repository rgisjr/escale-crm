/**
 * GET /api/v1/pipelines/:id/campos-ocultos — os campos ocultos que valem para a
 * origem (fork Escale, Fase 2C; D4). Qualquer papel: a ficha do negócio precisa
 * saber o que esconder. Com "Utilizar a mesma configuração do grupo", vale a
 * lista do grupo da origem. Lê com a sessão (RLS); a organização vem da sessão.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { OCULTOS_VAZIOS, lerOcultos, ocultosEfetivos } from "@/lib/escale/campos/ocultos";
import { traduzir } from "@/lib/i18n/dicionario";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("not_found", traduzir("Origem não encontrada.", authz.user.idioma), 404, { requestId });
  }
  try {
    const supabase = await createClient();
    const { data: origem, error } = await supabase
      .from("crm_pipelines")
      .select("settings, group_id")
      .eq("organization_id", authz.org.orgId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!origem) return fail("not_found", traduzir("Origem não encontrada.", authz.user.idioma), 404, { requestId });
    const daOrigem = lerOcultos(origem.settings);
    let doGrupo = null;
    if (daOrigem.usar_do_grupo && origem.group_id) {
      const { data: grupo, error: erroDoGrupo } = await supabase
        .from("crm_pipeline_groups")
        .select("settings")
        .eq("organization_id", authz.org.orgId)
        .eq("id", origem.group_id)
        .maybeSingle();
      if (erroDoGrupo) throw erroDoGrupo;
      doGrupo = grupo ? lerOcultos(grupo.settings) : null;
    }
    return ok(ocultosEfetivos(daOrigem, doGrupo) ?? OCULTOS_VAZIOS, { requestId });
  } catch (err) {
    logger.error("pipelines.campos-ocultos.get", { err });
    return fail("internal_error", traduzir("Não foi possível carregar os campos.", authz.user.idioma), 500, { requestId });
  }
}
