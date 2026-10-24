import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { POR_PAGINA, POR_PAGINA_PADRAO } from "@/lib/escale/contatos/regras";
import { lerPaginaDeProspeccoes } from "@/lib/escale/prospeccao/banco";
import { padraoDaBusca, situacoesDoTexto } from "@/lib/escale/prospeccao/filtros";
import { traduzir } from "@/lib/i18n/dicionario";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

const consultaSchema = z.object({
  p: z.coerce.number().int().min(1).max(100_000).default(1),
  n: z.coerce
    .number()
    .int()
    .refine((n) => (POR_PAGINA as readonly number[]).includes(n))
    .default(POR_PAGINA_PADRAO),
  q: z.string().trim().max(120).optional(),
  s: z.string().max(200).optional(),
});

/**
 * GET /api/v1/prospeccao-da-casca — a lista de prospecções da casca (fork
 * Escale, Fase 8D). Admin, como o GET do original; lê pelo pool do servidor,
 * com a organização da sessão.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("admin", { requestId, resource: "prospecting" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lida = consultaSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!lida.success)
    return fail("validation_failed", t("Query inválida."), 422, { requestId, headers });
  const situacoes = situacoesDoTexto(lida.data.s);
  if (situacoes === null)
    return fail("validation_failed", t("Filtro inválido."), 422, { requestId, headers });
  try {
    const pagina = await lerPaginaDeProspeccoes(
      getRequestPool(),
      authz.org.orgId,
      { padrao: lida.data.q ? padraoDaBusca(lida.data.q) : null, situacoes },
      lida.data.p,
      lida.data.n,
    );
    return ok(pagina, { requestId, headers });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId, headers });
  }
}
