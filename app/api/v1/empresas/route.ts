/**
 * GET/POST /api/v1/empresas — a lista de empresas da casca e o "Nova empresa"
 * (fork Escale, Fase 2D; migration 9105). Ver: todo papel. Criar: atendente ou
 * acima (PRD §5), pela função definer com o service role.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { ErroDaEmpresa, STATUS_DO_ERRO_DA_EMPRESA, TEXTO_DO_ERRO_DA_EMPRESA, criarEmpresa, listarEmpresas } from "@/lib/escale/empresas/banco";
import { consultaDaListaDeEmpresasSchema, novaEmpresaSchema } from "@/lib/escale/empresas/regras";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const ROTA = "/api/v1/empresas";

/** O erro tipado vira a resposta com o texto da Clint; outro erro, null. */
export function respostaDoErroDaEmpresa(err: unknown, t: (s: string) => string, requestId: string): Response | null {
  if (!(err instanceof ErroDaEmpresa)) return null;
  return fail(err.codigo, t(TEXTO_DO_ERRO_DA_EMPRESA[err.codigo]), STATUS_DO_ERRO_DA_EMPRESA[err.codigo], { requestId });
}

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "companies" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const consulta = consultaDaListaDeEmpresasSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!consulta.success) return fail("unprocessable_entity", t("Consulta inválida."), 422, { requestId });
  try {
    const pagina = await listarEmpresas(await createClient(), authz.org.orgId, consulta.data);
    return ok(pagina);
  } catch (err) {
    return falhaInesperadaDoQuadro(err as { code?: string; message?: string }, { rota: ROTA, operacao: "listar" }, t, requestId);
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("agent", { requestId, resource: "companies" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = novaEmpresaSchema.safeParse(corpo.json);
  if (!lido.success) return fail("unprocessable_entity", t("Informe o nome da empresa e o contato."), 422, { requestId });
  try {
    const id = await criarEmpresa(createAdminClient(), authz.org.orgId, authz.user.id, lido.data);
    void audit({
      action: "companies.created_by_escale",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "companies",
      resourceId: id,
      requestId,
      metadata: { contato_id: lido.data.contato_id, com_cnpj: Boolean(lido.data.cnpj) },
    });
    return ok({ id }, { status: 201 });
  } catch (err) {
    return respostaDoErroDaEmpresa(err, t, requestId) ?? falhaInesperadaDoQuadro(err as { code?: string; message?: string }, { rota: ROTA, operacao: "criar" }, t, requestId);
  }
}
