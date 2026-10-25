import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, noContent } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const corpoSchema = z.object({
  channel_session_id: z.string().uuid(),
  setor_id: z.string().uuid().nullable(),
});

/** "Setor de atendimento" da janela do dispositivo (c101). Admin, como as rotas de dispositivo do original. */
export async function PUT(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("admin", { requestId, resource: "channel_sessions" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = await lerJson(req);
  const parsed = corpoSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  const { channel_session_id, setor_id } = parsed.data;
  const supabase = await createClient();
  const { error } = setor_id
    ? await supabase.from("crm_setor_do_dispositivo").upsert(
        {
          channel_session_id,
          organization_id: authz.org.orgId,
          setor_id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "channel_session_id" },
      )
    : await supabase
        .from("crm_setor_do_dispositivo")
        .delete()
        .eq("organization_id", authz.org.orgId)
        .eq("channel_session_id", channel_session_id);
  if (error) {
    if (error.code === "23503")
      return fail("not_found", t("Dispositivo ou setor não encontrado."), 404, { requestId });
    return falhaInesperadaDoQuadro(error, { rota: "setores/do-dispositivo", operacao: "gravar" }, t, requestId);
  }
  void audit({
    action: "crm_setor.device_set",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "channel_session",
    resourceId: channel_session_id,
    requestId,
    metadata: { setor_id },
  });
  return noContent(requestId);
}
