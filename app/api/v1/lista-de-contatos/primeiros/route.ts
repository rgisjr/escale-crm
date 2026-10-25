/**
 * GET /api/v1/lista-de-contatos/primeiros — os ids dos N primeiros contatos de
 * uma busca, na ordem da lista (fork Escale, B3-1 da revisão de 24/10/2026).
 * Serve ao "Selecionar [N]": congela quem estava entre os N no momento do clique.
 * `organization_id` sai da sessão; a RLS de quem olha decide os contatos.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { compilarFiltros } from "@/lib/escale/contatos/compilar-filtros";
import { temFiltros } from "@/lib/escale/contatos/filtros";
import {
  filtrosDaConsulta,
  fusoDaOrganizacao,
  parametrosDaBusca,
} from "@/lib/escale/contatos/lista";
import {
  consultaDosPrimeirosSchema,
  primeirosContatos,
} from "@/lib/escale/contatos/primeiros";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  // Selecionar para agir em massa é de gerente ou acima (PRD §5), como o pedido da ação.
  const authz = await requireRole("manager", { requestId, resource: "contacts" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const invalido = () =>
    fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, {
      requestId,
    });

  const lido = consultaDosPrimeirosSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!lido.success) return invalido();
  const filtros = filtrosDaConsulta(lido.data);
  if (filtros === null) return invalido();
  const busca = parametrosDaBusca(lido.data.q);
  if (busca.vazia) return ok({ ids: [] as string[] }, { requestId });

  try {
    const supabase = await createClient();
    const orgId = authz.org.orgId;
    const filtro = temFiltros(filtros)
      ? compilarFiltros(filtros, await fusoDaOrganizacao(supabase, orgId, authz.org.timezone))
      : {};
    const ids = await primeirosContatos(supabase, orgId, lido.data, busca, filtro);
    return ok({ ids }, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      {
        rota: "GET /api/v1/lista-de-contatos/primeiros",
        operacao: "ler os primeiros contatos da lista",
      },
      t,
      requestId,
    );
  }
}
