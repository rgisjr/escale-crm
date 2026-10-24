import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { listSelectableChannels } from "@/lib/channels/selectable";
import type { NumeroDaCampanha } from "@/lib/escale/campanhas/numeros";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/campanhas-da-casca/numeros — os números do "Dispositivo de
 * WhatsApp" (fork Escale, Fase 8B; N4). Três consultas e nenhum embed (o embed
 * ambíguo já derrubou o login, escale.13). O admin lê com `organization_id`
 * explícito, como `listSelectableChannels` documenta.
 */
export async function GET(_req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  try {
    const admin = createAdminClient();
    const org = authz.org.orgId;
    const canais = await listSelectableChannels(admin, org);
    const ids = canais.map((c) => c.id);
    if (ids.length === 0) return ok([] as NumeroDaCampanha[], { requestId });
    const [{ data: provedores }, { data: vinculos }] = await Promise.all([
      admin
        .from("channel_sessions")
        .select("id, provider")
        .eq("organization_id", org)
        .in("id", ids),
      admin
        .from("crm_setor_do_dispositivo")
        .select("channel_session_id, setor_id")
        .eq("organization_id", org)
        .in("channel_session_id", ids),
    ]);
    const setorDe = new Map(
      ((vinculos ?? []) as Array<{ channel_session_id: string; setor_id: string }>).map((v) => [
        v.channel_session_id,
        v.setor_id,
      ]),
    );
    const idsDosSetores = [...new Set(setorDe.values())];
    const { data: setores } = idsDosSetores.length
      ? await admin
          .from("crm_setores")
          .select("id, nome")
          .eq("organization_id", org)
          .in("id", idsDosSetores)
      : { data: [] };
    const nomeDoSetor = new Map(
      ((setores ?? []) as Array<{ id: string; nome: string }>).map((s) => [s.id, s.nome]),
    );
    const provedorDe = new Map(
      ((provedores ?? []) as Array<{ id: string; provider: string | null }>).map((p) => [
        p.id,
        p.provider,
      ]),
    );
    const numeros: NumeroDaCampanha[] = canais.map((c) => ({
      id: c.id,
      nome: c.display_name,
      telefone: c.phone_number,
      conectado: c.status === "WORKING",
      oficial: !c.aceitaMensagemLivre,
      provider: provedorDe.get(c.id) ?? null,
      setor: nomeDoSetor.get(setorDe.get(c.id) ?? "") ?? null,
    }));
    return ok(numeros, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
