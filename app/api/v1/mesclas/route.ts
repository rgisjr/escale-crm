import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { ErroDaMescla, TEXTO_DO_ERRO_DA_MESCLA, mesclarGrupo, statusDoErroDaMescla } from "@/lib/escale/mescla/banco";
import { mesclarSchema } from "@/lib/escale/mescla/regras";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** FORK ESCALE · Fase 2E (C2, N11): mescla um grupo com a escolha por campo. */
export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "contacts" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const pedido = mesclarSchema.safeParse(lido.json);
  if (!pedido.success) {
    return fail("unprocessable_entity", t("São necessários ao menos 2 contatos."), 422, { requestId });
  }
  const { principal_id, secundarios, escolhas } = pedido.data;
  try {
    const supabase = await createClient();
    const resultado = await mesclarGrupo(
      supabase,
      createAdminClient(),
      authz.org.orgId,
      authz.user.id,
      principal_id,
      secundarios,
      escolhas,
    );
    void audit({
      action: "contact.merged",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "contact",
      resourceId: principal_id,
      requestId,
      metadata: { merged_contact_ids: secundarios, campos_escolhidos: Object.keys(escolhas), origem: "casca" },
    });
    return ok(resultado, { requestId });
  } catch (err) {
    if (err instanceof ErroDaMescla) {
      return fail("conflict", t(TEXTO_DO_ERRO_DA_MESCLA[err.codigo]), statusDoErroDaMescla(err.codigo), { requestId });
    }
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "POST /api/v1/mesclas", operacao: "mesclar contatos" },
      t,
      requestId,
    );
  }
}
