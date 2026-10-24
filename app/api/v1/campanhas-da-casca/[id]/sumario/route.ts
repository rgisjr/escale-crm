import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { ehIdDeCampanha, lerDetalheDaCampanha } from "@/lib/escale/campanhas/detalhe/banco";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { traduzir } from "@/lib/i18n/dicionario";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/campanhas-da-casca/:id/sumario — a aba Sumário e a coluna da
 * mensagem do detalhe da casca (fork Escale, Fase 8C). Gerente; a sessão de
 * quem olha (a 9310 é invoker); o pool de números pelo client admin, como o
 * GET do original.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  const naoAchou = () =>
    fail("campanha_nao_encontrada", t("Campanha não encontrada."), 404, { requestId });
  if (!ehIdDeCampanha(id)) return naoAchou();
  try {
    const supabase = await createClient();
    const fuso = await fusoDaOrganizacao(supabase, authz.org.orgId);
    const dados = await lerDetalheDaCampanha(
      supabase,
      createAdminClient(),
      authz.org.orgId,
      id,
      fuso,
    );
    return dados ? ok(dados, { requestId }) : naoAchou();
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
