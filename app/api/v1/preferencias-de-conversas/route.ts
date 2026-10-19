import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import {
  gravacaoSchema,
  gravarPreferenciaDaPessoa,
  lerPreferenciasDaPessoa,
} from "@/lib/escale/conversas/preferencias";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROTA = "/api/v1/preferencias-de-conversas";

/**
 * AS PREFERÊNCIAS DA TELA DE CONVERSAS DA CASCA (fork Escale, Fase 3A;
 * migration 9201). Pela sessão: a RLS entrega só as linhas da pessoa.
 */
export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  try {
    const preferencias = await lerPreferenciasDaPessoa(
      await createClient(),
      authz.org.orgId,
      authz.user.id,
    );
    return ok({ preferencias }, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: `GET ${ROTA}`, operacao: "ler as preferências de Conversas" },
      t,
      requestId,
    );
  }
}

export async function PUT(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("viewer", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = gravacaoSchema.safeParse(corpo.json);
  if (!lido.success) {
    return fail(
      "unprocessable_entity",
      t("Não consegui completar essa ação. Tente de novo."),
      422,
      {
        requestId,
        details: lido.error.flatten(),
      },
    );
  }

  const supabase = await createClient();
  const { error } = await gravarPreferenciaDaPessoa(
    supabase,
    authz.org.orgId,
    authz.user.id,
    lido.data,
  );
  if (error) {
    return falhaInesperadaDoQuadro(
      error,
      { rota: `PUT ${ROTA}`, operacao: "gravar a preferência de Conversas" },
      t,
      requestId,
    );
  }
  void audit({
    action: "conversation_prefs.updated",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_preferencias_de_conversas",
    resourceId: authz.user.id,
    requestId,
    metadata: { chave: lido.data.chave },
  });
  const preferencias = await lerPreferenciasDaPessoa(supabase, authz.org.orgId, authz.user.id);
  return ok({ preferencias }, { requestId });
}
