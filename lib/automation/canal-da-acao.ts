import { canalDaConversaOuDoContato } from "@/lib/canais/canal-da-conversa";
import type { ActionCtx } from "@/lib/automation/types";

/** Valor de `channel_session_id` que significa "o canal da própria conversa". */
export const CANAL_DA_CONVERSA = "conversation" as const;

export function canalDoContexto(payload: Record<string, unknown>): string | null {
  const v = payload.channel_session_id;
  return typeof v === "string" && v !== "" ? v : null;
}

/** O canal que a ação usa: o uuid fixo da config, ou (`conversation`) o da conversa do evento. */
export async function resolverCanalDaAcao(ctx: ActionCtx, valor: unknown): Promise<string | null> {
  if (typeof valor !== "string" || valor === "") return null;
  if (valor !== CANAL_DA_CONVERSA) return valor;
  const doEvento = canalDoContexto(ctx.event.payload);
  if (doEvento !== null) return doEvento;
  const contatoId = (ctx.context.contact as { id?: string } | undefined)?.id;
  if (!contatoId) return null;
  return canalDaConversaOuDoContato(ctx.admin, ctx.organizationId, { contactId: contatoId });
}
