import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { podeAdministrarEmpresa } from "@/lib/auth/pode-administrar-empresa";
import { criarGrupo, novoGrupoSchema } from "@/lib/escale/campos/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/api/wrappers";

import { respostaDoErroDoCatalogo } from "../route";

export const dynamic = "force-dynamic";


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

export async function POST(req: NextRequest) {
  const p = await porta();
  if ("erro" in p) return p.erro;
  const parse = novoGrupoSchema.safeParse(await req.json().catch(() => null));
  if (!parse.success) return fail("validation_failed", traduzir("O nome do grupo é obrigatório!", p.authz.user.idioma), 422);
  try {
    const grupo = await criarGrupo(await createClient(), p.authz.org.orgId, parse.data.objeto, parse.data.nome);
    await audit({ organizationId: p.authz.org.orgId, actorUserId: p.authz.user.id, action: "crm_field_group.created", resourceType: "crm_field_group", resourceId: grupo.id, metadata: { objeto: parse.data.objeto, nome: parse.data.nome } });
    return ok(grupo, { status: 201 });
  } catch (err) {
    const tipado = respostaDoErroDoCatalogo(err, p.authz.user.idioma);
    if (tipado) return tipado;
    logger.error("campos-do-crm.grupos.post", { err });
    return fail("internal_error", traduzir("Ocorreu um erro ao salvar", p.authz.user.idioma), 500);
  }
}
