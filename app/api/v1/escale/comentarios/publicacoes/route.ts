/**
 * GET /api/v1/escale/comentarios/publicacoes?canal=<uuid> — as 25 publicações mais recentes da conta
 * do Instagram/Facebook, para o seletor do gatilho de comentário (fork Escale, Fase 10B).
 */
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { zernioCredsForAccountId } from "@/lib/channels/zernio/credentials";
import { PLATAFORMAS_DE_COMENTARIO } from "@/lib/escale/comentarios/constantes";
import { publicacoesDaConta } from "@/lib/escale/comentarios/zernio";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const auth = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!auth.ok) return auth.response;

  const canal = z.string().uuid().safeParse(req.nextUrl.searchParams.get("canal"));
  const naoAchou = () => fail("not_found", "Conta não encontrada.", 404, { requestId });
  if (!canal.success) return naoAchou();

  try {
    const admin = createAdminClient();
    const { data: sessao, error } = await admin
      .from("channel_sessions")
      .select("zernio_account_id, status, metadata")
      .eq("organization_id", auth.org.orgId)
      .eq("id", canal.data)
      .eq("provider", "zernio_social")
      .is("archived_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const plataforma = (sessao?.metadata as Record<string, unknown> | null)?.social_platform;
    if (!sessao || typeof plataforma !== "string" || !(PLATAFORMAS_DE_COMENTARIO as readonly string[]).includes(plataforma)) {
      return naoAchou();
    }
    if (sessao.status !== "WORKING") {
      return fail("conta_desconectada", "A conta está desconectada.", 409, { requestId });
    }
    const credencial = await zernioCredsForAccountId(admin, {
      organizationId: auth.org.orgId,
      accountId: sessao.zernio_account_id as string,
    });
    if (!credencial) return fail("conta_desconectada", "A conta está desconectada.", 409, { requestId });

    const resposta = await publicacoesDaConta(credencial.apiKey, sessao.zernio_account_id as string);
    if (!resposta.ok) {
      if (resposta.status === 401 || resposta.status === 403) {
        return fail("acesso_recusado", "O Zernio recusou o acesso à conta.", 409, { requestId });
      }
      return fail("erro_ao_carregar", "Erro ao carregar publicações.", 502, { requestId });
    }
    return ok({ publicacoes: resposta.dados }, { requestId });
  } catch (err) {
    console.error("[escale-comentarios] publicacoes", requestId, err);
    return fail("internal_error", "Erro inesperado.", 500, { requestId });
  }
}
