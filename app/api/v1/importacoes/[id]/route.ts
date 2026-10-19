/** GET /api/v1/importacoes/[id] — uma importação (fork Escale, Fase 2F). Gerente ou acima. */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { lerImportacao } from "@/lib/escale/importacao/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await params;
  if (!UUID.test(id)) return fail("not_found", t("Importação não encontrada."), 404, { requestId });
  try {
    const importacao = await lerImportacao(await createClient(), authz.org.orgId, id);
    if (!importacao) return fail("not_found", t("Importação não encontrada."), 404, { requestId });
    return ok(importacao);
  } catch (err) {
    return falhaInesperadaDoQuadro(err as { code?: string; message?: string }, { rota: "/api/v1/importacoes/[id]", operacao: "ler" }, t, requestId);
  }
}
