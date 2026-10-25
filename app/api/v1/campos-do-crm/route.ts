import { NextRequest } from "next/server";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { podeAdministrarEmpresa } from "@/lib/auth/pode-administrar-empresa";
import { ErroDoCatalogo, TEXTO_DO_ERRO, criarCampo, lerCatalogosSemeando, novoCampoSchema } from "@/lib/escale/campos/banco";
import { OBJETOS_DE_CAMPO, type Catalogo, catalogoVisivel } from "@/lib/escale/campos/regras";
import type { Idioma } from "@/lib/i18n/idiomas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/api/wrappers";

export const dynamic = "force-dynamic";

const consultaSchema = z.object({ objeto: z.enum(OBJETOS_DE_CAMPO) });

/** Devolve o erro tipado do catálogo como 422 traduzido, ou null. */
export function respostaDoErroDoCatalogo(err: unknown, idioma: Idioma): Response | null {
  if (!(err instanceof ErroDoCatalogo)) return null;
  const status = err.codigo === "nao_encontrado" ? 404 : 422;
  return fail(`campo_${err.codigo}`, traduzir(TEXTO_DO_ERRO[err.codigo], idioma), status);
}

export async function GET(req: NextRequest) {
  const authz = await requireRole("viewer", { resource: "crm_campos_do_crm" });
  if (!authz.ok) return authz.response;
  const parse = consultaSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parse.success) return fail("validation_failed", traduzir("Objeto inválido.", authz.user.idioma), 422);
  try {
    const supabase = await createClient();
    // A semente só roda se o catálogo voltar sem grupos (organização nova).
    const [catalogo] = (await lerCatalogosSemeando(supabase, createAdminClient(), authz.org.orgId, [parse.data.objeto])) as [Catalogo];
    return ok(catalogoVisivel(catalogo, authz.org.role));
  } catch (err) {
    logger.error("campos-do-crm.get", { err });
    return fail("internal_error", traduzir("Não foi possível carregar os campos.", authz.user.idioma), 500);
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  const authz = await requireRole("manager", { resource: "crm_campos_do_crm" });
  if (!authz.ok) return authz.response;
  if (!podeAdministrarEmpresa(authz.user, authz.org)) {
    return fail("forbidden_role", traduzir("Só administrador gerencia os campos.", authz.user.idioma), 403);
  }
  const parse = novoCampoSchema.safeParse(await req.json().catch(() => null));
  if (!parse.success) return fail("validation_failed", traduzir("Pedido inválido.", authz.user.idioma), 422);
  try {
    const supabase = await createClient();
    const campo = await criarCampo(supabase, authz.org.orgId, parse.data);
    await audit({
      organizationId: authz.org.orgId,
      actorUserId: authz.user.id,
      action: "crm_field.created",
      resourceType: "crm_field", resourceId: campo.id,
      metadata: { objeto: campo.objeto, chave: campo.chave, tipo: campo.definicao.type },
    });
    return ok(campo, { status: 201 });
  } catch (err) {
    const tipado = respostaDoErroDoCatalogo(err, authz.user.idioma);
    if (tipado) return tipado;
    logger.error("campos-do-crm.post", { err });
    return fail("internal_error", traduzir("Não foi possível criar o campo.", authz.user.idioma), 500);
  }
}
