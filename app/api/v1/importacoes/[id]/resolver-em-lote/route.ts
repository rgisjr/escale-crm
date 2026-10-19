/** POST /api/v1/importacoes/[id]/resolver-em-lote — aplicar uma escolha a todas as pendências de um motivo (fork Escale, Fase 2F). */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { ErroDaImportacao, lerImportacao, resolverEmLote } from "@/lib/escale/importacao/banco";
import { loteSchema } from "@/lib/escale/importacao/tipos";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await params;
  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = loteSchema.safeParse(corpo.json);
  if (!lido.success) return fail("unprocessable_entity", t("Não foi possível iniciar a importação."), 422, { requestId });
  try {
    const importacao = /^[0-9a-f-]{36}$/i.test(id) ? await lerImportacao(await createClient(), authz.org.orgId, id) : null;
    if (!importacao) return fail("not_found", t("Importação não encontrada."), 404, { requestId });
    const linhas = await resolverEmLote(createAdminClient(), { importacaoId: id, motivo: lido.data.motivo, acao: lido.data.acao });
    void audit({
      action: "contacts.import_rows_resolved",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "crm_importacao",
      resourceId: id,
      requestId,
      metadata: { motivo: lido.data.motivo, acao: lido.data.acao, linhas },
    });
    return ok({ linhas });
  } catch (err) {
    if (err instanceof ErroDaImportacao) return fail("conflict", t(err.message), 409, { requestId });
    return falhaInesperadaDoQuadro(err as { code?: string; message?: string }, { rota: "/api/v1/importacoes/[id]/resolver-em-lote", operacao: "lote" }, t, requestId);
  }
}
