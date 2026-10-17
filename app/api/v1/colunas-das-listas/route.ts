/**
 * GET/PUT /api/v1/colunas-das-listas — as colunas que a pessoa escolheu em
 * "Personalizar colunas" (fork Escale, Fase 2A; migration 9101), como
 * `contacts_table_columns` da Clint. `organization_id` e `user_id` saem da sessão.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import {
  LISTAS_COM_COLUNAS,
  gravarColunasDaPessoa,
  lerColunasDaPessoa,
} from "@/lib/escale/colunas/banco";
import { colunasSchema, lerColunas } from "@/lib/escale/contatos/regras";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROTA = "/api/v1/colunas-das-listas";
const listaSchema = z.enum(LISTAS_COM_COLUNAS);
const corpoSchema = colunasSchema.extend({ lista: listaSchema }).strict();

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_colunas_das_listas" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lista = listaSchema.safeParse(req.nextUrl.searchParams.get("lista"));
  if (!lista.success) {
    return fail(
      "unprocessable_entity",
      t("Não consegui completar essa ação. Tente de novo."),
      422,
      { requestId },
    );
  }
  try {
    const itens = await lerColunasDaPessoa(
      await createClient(),
      authz.org.orgId,
      authz.user.id,
      lista.data,
    );
    return ok({ itens }, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: `GET ${ROTA}`, operacao: "ler as colunas" },
      t,
      requestId,
    );
  }
}

export async function PUT(req: NextRequest): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_colunas_das_listas" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = corpoSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail(
      "unprocessable_entity",
      t("Não consegui completar essa ação. Tente de novo."),
      422,
      {
        requestId,
        details: parsed.error.flatten(),
      },
    );
  }
  const itens = lerColunas({ itens: parsed.data.itens });
  const { error } = await gravarColunasDaPessoa(
    await createClient(),
    authz.org.orgId,
    authz.user.id,
    parsed.data.lista,
    itens,
  );
  if (error) {
    if (error.code === "23505") {
      return fail(
        "state_conflict",
        t("A preferência mudou em outra aba. Abra de novo e salve."),
        409,
        { requestId },
      );
    }
    return falhaInesperadaDoQuadro(
      error,
      { rota: `PUT ${ROTA}`, operacao: "gravar as colunas" },
      t,
      requestId,
    );
  }
  void audit({
    action: "list_columns.updated",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_colunas_das_listas",
    resourceId: authz.user.id,
    requestId,
    metadata: { lista: parsed.data.lista },
  });
  return ok({ itens }, { requestId });
}
