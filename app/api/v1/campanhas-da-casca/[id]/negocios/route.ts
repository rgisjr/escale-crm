import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { ehIdDeCampanha, lerNegocios } from "@/lib/escale/campanhas/detalhe/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const situacaoSchema = z.enum(["todos", "abertos", "ganhos"]).default("todos");

/** GET /api/v1/campanhas-da-casca/:id/negocios — a gaveta "Negócios criados" (Fase 8C, N5). */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!ehIdDeCampanha(id))
    return fail("campanha_nao_encontrada", t("Campanha não encontrada."), 404, { requestId });
  const situacao = situacaoSchema.safeParse(req.nextUrl.searchParams.get("situacao") ?? undefined);
  if (!situacao.success) return fail("validation_failed", t("Query inválida."), 422, { requestId });
  try {
    const supabase = await createClient();
    return ok(await lerNegocios(supabase, authz.org.orgId, id, situacao.data), { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
