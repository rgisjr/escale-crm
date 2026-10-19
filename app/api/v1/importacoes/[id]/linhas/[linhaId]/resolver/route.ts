/** POST /api/v1/importacoes/[id]/linhas/[linhaId]/resolver — resolver uma pendência e importar a linha na hora (fork Escale, Fase 2F). */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { ErroDaImportacao, resolverLinha } from "@/lib/escale/importacao/banco";
import { dependenciasReais } from "@/lib/escale/importacao/handler";
import { resolucaoSchema } from "@/lib/escale/importacao/tipos";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_DO_ERRO = { arquivo: 422, mapeamento: 422, origem: 422, ganho: 422, nao_encontrada: 404, estado: 409 } as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; linhaId: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id, linhaId } = await params;
  if (!UUID.test(id) || !UUID.test(linhaId)) return fail("not_found", t("Importação não encontrada."), 404, { requestId });
  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = resolucaoSchema.safeParse(corpo.json);
  if (!lido.success) return fail("unprocessable_entity", t("Não foi possível iniciar a importação."), 422, { requestId });
  try {
    const r = await resolverLinha(await createClient(), dependenciasReais(createAdminClient()), {
      orgId: authz.org.orgId,
      importacaoId: id,
      linhaId,
      resolucao: lido.data,
    });
    void audit({
      action: "contacts.import_row_resolved",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "crm_importacao",
      resourceId: id,
      requestId,
      metadata: { linha: linhaId, acao: lido.data.acao, resultado: r.status },
    });
    return ok(r);
  } catch (err) {
    if (err instanceof ErroDaImportacao) {
      return fail(err.codigo === "nao_encontrada" ? "not_found" : "conflict", t(err.message), STATUS_DO_ERRO[err.codigo], { requestId });
    }
    return falhaInesperadaDoQuadro(err as { code?: string; message?: string }, { rota: "/api/v1/importacoes/[id]/linhas/[linhaId]/resolver", operacao: "resolver" }, t, requestId);
  }
}
