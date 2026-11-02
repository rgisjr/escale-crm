/**
 * GET /api/v1/escale/comentarios/contas — as contas do Instagram/Facebook que a pessoa atende, para a
 * caixa de comentários (fork Escale, Fase 10A). O id da conta no Zernio não sai na resposta.
 */
import { randomUUID } from "node:crypto";

import { ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { contasDaCaixa } from "@/lib/escale/comentarios/contas-da-caixa";
import { erroInesperado } from "@/lib/escale/comentarios/rota-da-acao";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const auth = await requireRole("agent", { requestId, resource: "channel_session" });
  if (!auth.ok) return auth.response;
  try {
    const contas = await contasDaCaixa(createAdminClient(), {
      organizationId: auth.org.orgId,
      userId: auth.user.id,
      papel: auth.org.role,
    });
    return ok({ contas: contas.map(({ contaId: _contaId, ...conta }) => conta) }, { requestId });
  } catch (erro) {
    return erroInesperado("contas", requestId, erro);
  }
}
