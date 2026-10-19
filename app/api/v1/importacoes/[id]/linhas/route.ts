/** GET /api/v1/importacoes/[id]/linhas?quais=revisar|relatorio — as linhas da revisão ou do relatório (fork Escale, Fase 2F). */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { linhasDaImportacao } from "@/lib/escale/importacao/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("not_found", t("Importação não encontrada."), 404, { requestId });
  const quais = req.nextUrl.searchParams.get("quais") === "relatorio" ? "relatorio" : "revisar";
  try {
    return ok(await linhasDaImportacao(await createClient(), authz.org.orgId, id, quais));
  } catch (err) {
    return falhaInesperadaDoQuadro(err as { code?: string; message?: string }, { rota: "/api/v1/importacoes/[id]/linhas", operacao: "ler" }, t, requestId);
  }
}
