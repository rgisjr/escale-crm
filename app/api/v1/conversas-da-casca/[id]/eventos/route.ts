import { type NextRequest } from "next/server";

import { ok } from "@/lib/api/wrappers";
import {
  eventosDasAtribuicoes,
  type EventoDaConversa,
  type LinhaDaAtribuicao,
} from "@/lib/escale/conversas/eventos";

import { comAConversa } from "../_comum";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
const EVENTOS_MAX = 200;

/** Os eventos da thread (C2, C4): as atribuições do original e os eventos do fork, pela sessão. */
export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, false, async ({ authz, supabase, conversa, requestId }) => {
    const [atribuicoes, proprios] = await Promise.all([
      supabase
        .from("conversation_assignment_events")
        .select("id, from_user_id, to_user_id, changed_by, reason, created_at")
        .eq("organization_id", authz.org.orgId)
        .eq("conversation_id", conversa.id)
        .order("created_at", { ascending: true })
        .limit(EVENTOS_MAX),
      supabase
        .from("crm_eventos_da_conversa")
        .select("id, tipo, user_id, created_at")
        .eq("organization_id", authz.org.orgId)
        .eq("conversation_id", conversa.id)
        .order("created_at", { ascending: true })
        .limit(EVENTOS_MAX),
    ]);
    if (atribuicoes.error) throw atribuicoes.error;
    if (proprios.error) throw proprios.error;
    const eventos: EventoDaConversa[] = [
      ...eventosDasAtribuicoes((atribuicoes.data ?? []) as LinhaDaAtribuicao[]),
      ...(
        (proprios.data ?? []) as Array<{
          id: string;
          tipo: EventoDaConversa["tipo"];
          user_id: string | null;
          created_at: string;
        }>
      ).map((e) => ({
        id: e.id,
        tipo: e.tipo,
        em: e.created_at,
        user_id: e.user_id,
      })),
    ].sort((a, b) => Date.parse(a.em) - Date.parse(b.em));
    return ok(eventos, { requestId });
  });
}
