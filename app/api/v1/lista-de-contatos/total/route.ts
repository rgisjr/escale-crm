/**
 * GET /api/v1/lista-de-contatos/total — quantos contatos a consulta da lista devolve
 * (fork Escale, Q7d; função 9406). Mesmos `q`, `v` e `f` da página, sem `p` nem `n`: o
 * cliente pede uma vez por filtro e reaproveita nas trocas de página. `organization_id` sai
 * da sessão; a RLS de quem olha decide o que conta.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { compilarFiltros } from "@/lib/escale/contatos/compilar-filtros";
import { temFiltros } from "@/lib/escale/contatos/filtros";
import {
  consultaDaListaSchema,
  filtrosDaConsulta,
  fusoDaOrganizacao,
  totalDeContatos,
} from "@/lib/escale/contatos/lista";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "contacts" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const lido = consultaDaListaSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  const filtros = lido.success ? filtrosDaConsulta(lido.data) : null;
  if (!lido.success || filtros === null) {
    return fail(
      "unprocessable_entity",
      t("Não consegui completar essa ação. Tente de novo."),
      422,
      { requestId },
    );
  }
  try {
    const supabase = await createClient();
    const orgId = authz.org.orgId;
    const filtro = temFiltros(filtros)
      ? compilarFiltros(filtros, await fusoDaOrganizacao(supabase, orgId, authz.org.timezone))
      : undefined;
    return ok({ total: await totalDeContatos(supabase, orgId, lido.data, filtro) }, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "GET /api/v1/lista-de-contatos/total", operacao: "contar a lista de contatos" },
      t,
      requestId,
    );
  }
}
