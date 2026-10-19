import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { lerRespostas } from "@/lib/escale/conversas/respostas-banco";
import { canalDaConversa, respostaServe } from "@/lib/escale/conversas/respostas";
import { pode, setorEfetivo } from "@/lib/escale/conversas/setores-banco";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** O painel de respostas do compositor (c09, N14): as do canal e do setor da conversa. */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "message_templates" });
  if (!authz.ok) return authz.response;
  const url = new URL(req.url);
  const conversationId = lerUuid(url.searchParams.get("conversation_id"));
  if (!conversationId)
    return fail("validation_failed", "conversation_id inválido", 422, { requestId });
  const supabase = await createClient();
  try {
    const { data: conversa } = await supabase
      .from("conversations")
      .select(
        "id, channel_session_id, channel_sessions:channel_session_id ( provider, social_platform )",
      )
      .eq("organization_id", authz.org.orgId)
      .eq("id", conversationId)
      .maybeSingle();
    if (!conversa) return fail("not_found", "Conversa não encontrada.", 404, { requestId });
    const c = conversa as unknown as {
      id: string;
      channel_session_id: string;
      channel_sessions: { provider: string | null; social_platform: string | null } | null;
    };
    const [{ setorId }, podeOutrosSetores, todas] = await Promise.all([
      setorEfetivo(supabase, authz.org.orgId, c),
      pode(supabase, authz.org.orgId, "CHAT_VIEW_QUICK_RESPONSE_OTHER_TEAMS"),
      lerRespostas(supabase, authz.org.orgId),
    ]);
    const pedido = lerUuid(url.searchParams.get("setor"));
    const setorEscolhido = podeOutrosSetores ? pedido : null;
    const canal = canalDaConversa(c.channel_sessions);
    const respostas = todas.filter((r) =>
      respostaServe(r, { canal, setorDaConversa: setorId, setorEscolhido }),
    );
    return ok({ respostas, setorDaConversa: setorId, podeOutrosSetores }, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
