import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { comentariosDoContato } from "@/lib/escale/comentarios/do-contato";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** FORK ESCALE · Fase 10C: de que comentário o contato veio (origem e os mais recentes). */
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
    const dados = await comentariosDoContato(await createClient(), authz.org.orgId, id);
    if (!dados) return fail("not_found", t("Não consegui carregar o contato."), 404, { requestId });
    return ok(dados, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "GET /api/v1/contatos/[id]/comentarios", operacao: "ler os comentários do contato" },
      t,
      requestId,
    );
  }
}
