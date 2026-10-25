/**
 * GET /api/v1/lista-de-contatos — uma página da lista de contatos da casca
 * (fork Escale, Fase 2A; função 9101). `organization_id` sai da sessão; a RLS
 * de quem olha decide os contatos e os negócios contados.
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
  listarContatos,
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
  if (!lido.success) {
    return fail(
      "unprocessable_entity",
      t("Não consegui completar essa ação. Tente de novo."),
      422,
      {
        requestId,
        details: lido.error.flatten(),
      },
    );
  }
  // FORK ESCALE · Fase 2B: o filtro vem compilado (padrão sem acento, tags, fuso).
  const filtros = filtrosDaConsulta(lido.data);
  if (filtros === null) {
    return fail(
      "unprocessable_entity",
      t("Não consegui completar essa ação. Tente de novo."),
      422,
      {
        requestId,
      },
    );
  }
  try {
    const supabase = await createClient();
    const orgId = authz.org.orgId;
    const filtro = temFiltros(filtros)
      ? compilarFiltros(filtros, await fusoDaOrganizacao(supabase, orgId, authz.org.timezone))
      : undefined;
    return ok(await listarContatos(supabase, orgId, lido.data, filtro), { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "GET /api/v1/lista-de-contatos", operacao: "ler a lista de contatos" },
      t,
      requestId,
    );
  }
}
