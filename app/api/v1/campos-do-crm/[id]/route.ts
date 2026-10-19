import { NextRequest } from "next/server";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { podeAdministrarEmpresa } from "@/lib/auth/pode-administrar-empresa";
import { excluirCampo, mudarCampo, patchDoCampoSchema } from "@/lib/escale/campos/banco";
import { OBJETOS_DE_CAMPO } from "@/lib/escale/campos/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/api/wrappers";

import { respostaDoErroDoCatalogo } from "../route";

export const dynamic = "force-dynamic";

const objetoSchema = z.object({ objeto: z.enum(OBJETOS_DE_CAMPO) });
type Ctx = { params: Promise<{ id: string }> };

async function porta(req: NextRequest) {
  const authz = await requireRole("manager", { resource: "crm_campos_do_crm" });
  if (!authz.ok) return { erro: authz.response } as const;
  if (!podeAdministrarEmpresa(authz.user, authz.org)) {
    return { erro: fail("forbidden_role", traduzir("Só administrador gerencia os campos.", authz.user.idioma), 403) } as const;
  }
  const objeto = objetoSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!objeto.success) return { erro: fail("validation_failed", traduzir("Objeto inválido.", authz.user.idioma), 422) } as const;
  return { authz, objeto: objeto.data.objeto } as const;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const denied = await requireSupportWrite();
  if (denied) return denied;
    const p = await porta(req);
  if ("erro" in p) return p.erro;
  const { id } = await ctx.params;
  const parse = patchDoCampoSchema.safeParse(await req.json().catch(() => null));
  if (!parse.success) return fail("validation_failed", traduzir("Pedido inválido.", p.authz.user.idioma), 422);
  try {
    const campo = await mudarCampo(await createClient(), p.authz.org.orgId, p.objeto, id, parse.data);
    await audit({ organizationId: p.authz.org.orgId, actorUserId: p.authz.user.id, action: "crm_field.updated", resourceType: "crm_field", resourceId: id, metadata: { objeto: p.objeto, patch: parse.data } });
    return ok(campo);
  } catch (err) {
    const tipado = respostaDoErroDoCatalogo(err, p.authz.user.idioma);
    if (tipado) return tipado;
    logger.error("campos-do-crm.patch", { err });
    return fail("internal_error", traduzir("Ocorreu um erro ao salvar", p.authz.user.idioma), 500);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const denied = await requireSupportWrite();
  if (denied) return denied;
    const p = await porta(req);
  if ("erro" in p) return p.erro;
  const { id } = await ctx.params;
  try {
    await excluirCampo(await createClient(), p.authz.org.orgId, p.objeto, id);
    await audit({ organizationId: p.authz.org.orgId, actorUserId: p.authz.user.id, action: "crm_field.deleted", resourceType: "crm_field", resourceId: id, metadata: { objeto: p.objeto } });
    return ok({ id });
  } catch (err) {
    const tipado = respostaDoErroDoCatalogo(err, p.authz.user.idioma);
    if (tipado) return tipado;
    logger.error("campos-do-crm.delete", { err });
    return fail("internal_error", traduzir("Ocorreu um erro ao salvar", p.authz.user.idioma), 500);
  }
}
