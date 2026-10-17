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
import { consultaDaListaSchema, listarContatos } from "@/lib/escale/contatos/lista";
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
  try {
    return ok(await listarContatos(await createClient(), authz.org.orgId, lido.data), {
      requestId,
    });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "GET /api/v1/lista-de-contatos", operacao: "ler a lista de contatos" },
      t,
      requestId,
    );
  }
}
