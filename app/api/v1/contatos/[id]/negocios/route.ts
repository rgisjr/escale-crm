import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { negociosDoContato } from "@/lib/escale/ficha-do-contato/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** FORK ESCALE · Fase 2E (N9): os negócios do contato que quem olha enxerga. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "contacts" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("not_found", t("Não consegui carregar o contato."), 404, { requestId });
  }
  try {
    const ficha = await negociosDoContato(await createClient(), authz.org.orgId, id);
    if (!ficha) return fail("not_found", t("Não consegui carregar o contato."), 404, { requestId });
    return ok(ficha, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "GET /api/v1/contatos/[id]/negocios", operacao: "ler os negócios do contato" },
      t,
      requestId,
    );
  }
}
