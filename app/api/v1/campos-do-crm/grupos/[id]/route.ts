import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { podeAdministrarEmpresa } from "@/lib/auth/pode-administrar-empresa";
import { excluirGrupo, renomearGrupo, renomearGrupoSchema } from "@/lib/escale/campos/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/api/wrappers";

import { respostaDoErroDoCatalogo } from "../../route";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function porta() {
  const denied = await requireSupportWrite();
  if (denied) return { erro: denied } as const;
  const authz = await requireRole("manager", { resource: "crm_campos_do_crm" });
  if (!authz.ok) return { erro: authz.response } as const;
  if (!podeAdministrarEmpresa(authz.user, authz.org)) {
    return { erro: fail("forbidden_role", traduzir("Só administrador gerencia os campos.", authz.user.idioma), 403) } as const;
  }
  return { authz } as const;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const p = await porta();
  if ("erro" in p) return p.erro;
  const { id } = await ctx.params;
  const parse = renomearGrupoSchema.safeParse(await req.json().catch(() => null));
  if (!parse.success) return fail("validation_failed", traduzir("O nome do grupo é obrigatório!", p.authz.user.idioma), 422);
  try {
    await renomearGrupo(await createClient(), p.authz.org.orgId, id, parse.data.nome);
    await audit({ organizationId: p.authz.org.orgId, actorUserId: p.authz.user.id, action: "crm_field_group.updated", resourceType: "crm_field_group", resourceId: id, metadata: { nome: parse.data.nome } });
    return ok({ id });
  } catch (err) {
    const tipado = respostaDoErroDoCatalogo(err, p.authz.user.idioma);
    if (tipado) return tipado;
    logger.error("campos-do-crm.grupos.patch", { err });
    return fail("internal_error", traduzir("Ocorreu um erro ao salvar", p.authz.user.idioma), 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const p = await porta();
  if ("erro" in p) return p.erro;
  const { id } = await ctx.params;
  try {
    await excluirGrupo(await createClient(), p.authz.org.orgId, id);
    await audit({ organizationId: p.authz.org.orgId, actorUserId: p.authz.user.id, action: "crm_field_group.deleted", resourceType: "crm_field_group", resourceId: id, metadata: {} });
    return ok({ id });
  } catch (err) {
    const tipado = respostaDoErroDoCatalogo(err, p.authz.user.idioma);
    if (tipado) return tipado;
    logger.error("campos-do-crm.grupos.delete", { err });
    return fail("internal_error", traduzir("Ocorreu um erro ao salvar", p.authz.user.idioma), 500);
  }
}
