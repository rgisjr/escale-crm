import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { resolverReferenciaDeAtivo } from "@/lib/automation/envio-de-passos";
import { requireRole } from "@/lib/auth/require-role";
import { lerAtivosDoCanal } from "@/lib/canais/ativos-do-canal";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { copiarAtivoParaConversa } from "@/lib/midia/ativos-banco";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

const corpoSchema = z.object({ conversation_id: z.string().uuid() });

/**
 * Prepara o anexo de uma resposta rápida para a conversa: copia o arquivo para a pasta da conversa e devolve
 * o caminho, que o compositor manda pelo envio de mídia de sempre. Só vale o anexo GRAVADO na resposta
 * (o corpo não escolhe arquivo), e resposta e conversa são lidas pela sessão (RLS) com a organização explícita.
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "message_templates" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;

  const id = lerUuid((await ctx.params).id);
  const lido = await lerJson(req);
  const parsed = corpoSchema.safeParse(lido.ok ? lido.json : null);
  if (!id || !parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });

  const sessao = await createClient();
  try {
    const [resposta, anexo, conversa] = await Promise.all([
      sessao.from("message_templates").select("id").eq("organization_id", orgId).eq("id", id).maybeSingle(),
      sessao
        .from("crm_respostas_rapidas_anexos")
        .select("asset")
        .eq("organization_id", orgId)
        .eq("template_id", id)
        .maybeSingle(),
      sessao
        .from("conversations")
        .select("id, channel_session_id")
        .eq("organization_id", orgId)
        .eq("id", parsed.data.conversation_id)
        .maybeSingle(),
    ]);
    if (resposta.error) throw resposta.error;
    if (anexo.error) throw anexo.error;
    if (conversa.error) throw conversa.error;
    if (!resposta.data || !anexo.data)
      return fail("not_found", t("Esta resposta não tem anexo."), 404, { requestId });
    if (!conversa.data) return fail("not_found", t("Conversa não encontrada."), 404, { requestId });

    const admin = createAdminClient();
    const canal = (conversa.data as { channel_session_id: string | null }).channel_session_id;
    const referencia = (anexo.data as { asset: string }).asset;
    const ativos = referencia.startsWith("var:") ? await lerAtivosDoCanal(admin, orgId, canal) : {};
    const assetId = resolverReferenciaDeAtivo(referencia, ativos);
    if (!assetId)
      return fail("not_found", t("Este número não tem o arquivo desta resposta."), 404, { requestId });

    const copia = await copiarAtivoParaConversa(admin, {
      organizationId: orgId,
      assetId,
      conversationId: parsed.data.conversation_id,
    });
    return ok(
      { media_storage_path: copia.storagePath, media_mime: copia.mime, type: copia.tipo },
      { requestId },
    );
  } catch (err) {
    logger.error("[respostas-rapidas] anexo indisponível", { error: (err as Error).message, requestId });
    return fail("internal_error", t("Não foi possível preparar o anexo."), 500, { requestId });
  }
}
