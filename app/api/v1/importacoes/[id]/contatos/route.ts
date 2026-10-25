import { randomUUID } from "node:crypto";

import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGINA = 1000;

/**
 * GET /api/v1/importacoes/[id]/contatos — os contatos que a importação criou ou
 * atualizou (fork Escale, Fase 8B; N10: o .csv do assistente). Gerente ou
 * acima, sessão do usuário (a RLS da 9107). As linhas somem em 30 dias (LGPD):
 * quem chama guarda os ids na hora.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await params;
  if (!UUID.test(id)) return fail("not_found", t("Importação não encontrada."), 404, { requestId });
  try {
    const supabase = await createClient();
    const ids: string[] = [];
    const vistos = new Set<string>();
    let ultimo = 0;
    for (;;) {
      let consulta = supabase
        .from("crm_importacoes_linhas")
        .select("numero, contato_id")
        .eq("organization_id", authz.org.orgId)
        .eq("importacao_id", id)
        .not("contato_id", "is", null)
        .order("numero", { ascending: true })
        .limit(PAGINA);
      if (ultimo > 0) consulta = consulta.gt("numero", ultimo);
      const { data, error } = await consulta;
      if (error) throw new Error(error.message);
      const linhas = (data ?? []) as Array<{ numero: number; contato_id: string }>;
      if (linhas.length === 0) break;
      for (const l of linhas) {
        if (vistos.has(l.contato_id)) continue;
        vistos.add(l.contato_id);
        ids.push(l.contato_id);
      }
      ultimo = linhas[linhas.length - 1]!.numero;
    }
    return ok({ ids }, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(err as Error, { rota: "importacoes/contatos", operacao: "listar" }, t, requestId);
  }
}
