import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import {
  POR_PAGINA_DOS_DESTINATARIOS,
  POR_PAGINA_PADRAO_DOS_DESTINATARIOS,
} from "@/lib/escale/campanhas/detalhe/apresentacao";
import { ehIdDeCampanha, lerDestinatarios } from "@/lib/escale/campanhas/detalhe/banco";
import {
  compilarFiltrosDeDestinatarios,
  filtrosDeDestinatariosDoTexto,
} from "@/lib/escale/campanhas/detalhe/filtros";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const consultaSchema = z.object({
  p: z.coerce.number().int().min(1).max(100_000).default(1),
  n: z.coerce
    .number()
    .int()
    .refine((n) => (POR_PAGINA_DOS_DESTINATARIOS as readonly number[]).includes(n))
    .default(POR_PAGINA_PADRAO_DOS_DESTINATARIOS),
  f: z.string().max(4096).optional(),
});

/** GET /api/v1/campanhas-da-casca/:id/destinatarios — a aba Detalhes (Fase 8C, N9). */
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
  const lida = consultaSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!lida.success) return fail("validation_failed", t("Query inválida."), 422, { requestId });
  const filtros = filtrosDeDestinatariosDoTexto(lida.data.f);
  if (filtros === null) return fail("validation_failed", t("Filtro inválido."), 422, { requestId });
  try {
    const supabase = await createClient();
    const pagina = await lerDestinatarios(
      supabase,
      authz.org.orgId,
      id,
      compilarFiltrosDeDestinatarios(filtros),
      lida.data.p,
      lida.data.n,
    );
    return ok(pagina, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
