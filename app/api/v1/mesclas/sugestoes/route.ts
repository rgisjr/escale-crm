import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { lerSugestoes } from "@/lib/escale/mescla/banco";
import { consultaDeSugestoesSchema } from "@/lib/escale/mescla/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** FORK ESCALE · Fase 2E (C2): as sugestões de mescla da casca, para gerente ou acima (PRD §5). */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "contacts" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = consultaDeSugestoesSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!lido.success) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, { requestId });
  }
  try {
    const supabase = await createClient();
    const { data, total } = await lerSugestoes(supabase, authz.org.orgId, lido.data);
    return ok(data, { requestId, meta: { total } });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "GET /api/v1/mesclas/sugestoes", operacao: "ler as sugestões de mescla" },
      t,
      requestId,
    );
  }
}
