/**
 * GET/PUT /api/v1/capas-do-card — a preferência "Personalizar cards" da pessoa
 * (fork Escale, Fase 1E; migration 9005), como a `kanban_card` da Clint. Vale em
 * todas as origens. `organization_id` e `user_id` saem da sessão.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import {
  falhaInesperadaDoQuadro,
  gravarPrefsDaPessoa,
  lerPrefsDaPessoa,
} from "@/lib/escale/capa/banco";
import { prefsDoCardSchema } from "@/lib/escale/capa/tipos";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROTA = "/api/v1/capas-do-card";
const corpoSchema = z.object({ prefs: prefsDoCardSchema }).strict();
type ErroDoBanco = { code?: string; message?: string };

export async function GET(_req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_capas_do_card" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  try {
    return ok(
      { prefs: await lerPrefsDaPessoa(await createClient(), authz.org.orgId, authz.user.id) },
      { requestId },
    );
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as ErroDoBanco,
      { rota: `GET ${ROTA}`, operacao: "ler a preferência" },
      t,
      requestId,
    );
  }
}

export async function PUT(req: NextRequest): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_capas_do_card" });
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
  const { prefs } = parsed.data;
  const { error } = await gravarPrefsDaPessoa(
    await createClient(),
    authz.org.orgId,
    authz.user.id,
    prefs,
  );
  if (error) {
    if (error.code === "23505")
      return fail(
        "state_conflict",
        t("A preferência mudou em outra aba. Abra de novo e salve."),
        409,
        { requestId },
      );
    return falhaInesperadaDoQuadro(
      error,
      { rota: `PUT ${ROTA}`, operacao: "gravar a preferência" },
      t,
      requestId,
    );
  }

  void audit({
    action: "card_cover.updated",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_capa_do_card",
    resourceId: authz.user.id,
    requestId,
    metadata: {},
  });
  return ok({ prefs }, { requestId });
}
