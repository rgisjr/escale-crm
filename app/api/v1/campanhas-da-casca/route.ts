import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { assistenteSchema } from "@/lib/escale/campanhas/assistente";
import { criarRascunho } from "@/lib/escale/campanhas/rascunho";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { lerPaginaDeCampanhas } from "@/lib/escale/campanhas/banco";
import { compilarFiltros, filtrosDoTexto } from "@/lib/escale/campanhas/filtros";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { POR_PAGINA, POR_PAGINA_PADRAO } from "@/lib/escale/contatos/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const consultaSchema = z.object({
  p: z.coerce.number().int().min(1).max(100_000).default(1),
  n: z.coerce
    .number()
    .int()
    .refine((n) => (POR_PAGINA as readonly number[]).includes(n))
    .default(POR_PAGINA_PADRAO),
  f: z.string().max(4096).optional(),
});

/**
 * GET /api/v1/campanhas-da-casca — a lista de campanhas da casca (fork Escale,
 * Fase 8A). Gerente, como as rotas do original; a sessão de quem olha (a 9301
 * é invoker) e o fuso da organização para as datas do filtro.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lida = consultaSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!lida.success) return fail("validation_failed", t("Query inválida."), 422, { requestId });
  const filtros = filtrosDoTexto(lida.data.f);
  if (filtros === null) return fail("validation_failed", t("Filtro inválido."), 422, { requestId });
  try {
    const supabase = await createClient();
    const fuso = await fusoDaOrganizacao(supabase, authz.org.orgId);
    const pagina = await lerPaginaDeCampanhas(
      supabase,
      authz.org.orgId,
      compilarFiltros(filtros, fuso),
      lida.data.p,
      lida.data.n,
    );
    return ok(pagina, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}

/**
 * POST /api/v1/campanhas-da-casca — cria o rascunho do assistente (fork Escale,
 * Fase 8B; N14). Gerente, client admin, a organização do papel.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = assistenteSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) {
    return fail("validation_failed", t("Dados inválidos."), 422, {
      requestId,
      details: lido.error.flatten().fieldErrors as Record<string, unknown>,
    });
  }
  try {
    const r = await criarRascunho(createAdminClient(), authz.org.orgId, authz.user.id, lido.data);
    if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
    void audit({
      action: "campaign.created",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "campaign",
      resourceId: r.id,
      requestId,
      metadata: {
        base_legal: lido.data.baseLegal,
        via: "assistente",
        mensagem: lido.data.mensagem.tipo,
      },
    });
    return ok({ id: r.id }, { requestId, status: 201 });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
