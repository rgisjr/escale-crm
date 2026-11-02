import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { SocialError, socialRequest } from "@/lib/channels/social/client";
import { EVENTOS_DA_ASSINATURA_SOCIAL, readSocialIntegration } from "@/lib/channels/social/store";

import { GATILHO_DE_COMENTARIO } from "./constantes";

/**
 * FORK ESCALE · Fase 10B (D14): garante que a assinatura do webhook do canal recebe `comment.received`.
 * Canal novo já nasce com o evento; canal antigo ganha o evento aqui, por `PUT webhooks/settings`
 * (parcial) e relê a assinatura para provar.
 */
export type EstadoDaAssinatura = "ja_assinada" | "assinada";

const assinaturasSchema = z.object({
  webhooks: z.array(z.object({ _id: z.string(), url: z.string(), events: z.array(z.string()).optional() })),
});

export async function garantirAssinaturaDeComentarios(
  db: SupabaseClient,
  org: string,
  channelSessionId: string,
): Promise<EstadoDaAssinatura> {
  const { data, error } = await db
    .from("channel_sessions")
    .select("webhook_path_token")
    .eq("organization_id", org)
    .eq("id", channelSessionId)
    .eq("provider", "zernio_social")
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw new SocialError("Não foi possível ler o canal.", 500);
  const token = data?.webhook_path_token;
  if (typeof token !== "string" || token.length === 0) throw new SocialError("Canal não encontrado.", 404);

  const integracao = await readSocialIntegration(db, org);
  if (!integracao) throw new SocialError("Configure a integração primeiro.", 422);

  const caminho = `/api/v1/webhooks/channel/${token}`;
  const ler = async () =>
    assinaturasSchema.parse(await socialRequest(integracao.key, "webhooks/settings")).webhooks.find((w) => w.url.endsWith(caminho));

  const achada = await ler();
  if (!achada) throw new SocialError("Não há assinatura de webhook para esta conta. Reconecte a conta em Canais.", 422);
  if (achada.events?.includes(GATILHO_DE_COMENTARIO)) return "ja_assinada";

  await socialRequest(
    integracao.key,
    "webhooks/settings",
    { webhookId: achada._id, events: [...new Set([...(achada.events ?? []), ...EVENTOS_DA_ASSINATURA_SOCIAL])] },
    "PUT",
  );
  const relida = await ler();
  if (!relida?.events?.includes(GATILHO_DE_COMENTARIO)) {
    throw new SocialError("O provedor não confirmou a assinatura de comentários.", 502);
  }
  return "assinada";
}
