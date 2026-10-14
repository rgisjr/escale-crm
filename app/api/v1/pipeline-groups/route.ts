/**
 * POST /api/v1/pipeline-groups — cria um GRUPO DE FUNIS (fork Escale, Fase 1A).
 *
 * Auth: sessão por cookie, papel manager+ (o mesmo de criar funil). A
 * `organization_id` sai da sessão, nunca do corpo. Responde com as origens
 * inteiras relidas do banco.
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

const corpoSchema = z.object({ name: z.string().max(200) }).strict();

export async function POST(req: NextRequest): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipeline_groups" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;

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

  const veredito = validarNomeDeGrupo(parsed.data.name, antes.origens.grupos, null);
  if (!veredito.ok) return fail("unprocessable_entity", t(veredito.erro), 422, { requestId });

  const { data: criado, error } = await supabase
    .from("crm_pipeline_groups")
    .insert({ organization_id: orgId, name: veredito.nome })
    .select("id")
    .single();
  if (error) return nomeRepetido(error, t, requestId) ?? fail("internal_error", error.message, 500, { requestId });

  void audit({
    action: "pipeline_group.created",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline_group",
    resourceId: (criado as { id: string }).id,
    requestId,
    metadata: { name: veredito.nome },
  });

  return responderComOrigens(supabase, orgId, requestId, 201);
}
