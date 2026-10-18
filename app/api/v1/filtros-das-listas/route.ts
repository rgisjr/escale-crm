/**
 * GET/POST /api/v1/filtros-das-listas — os filtros salvos de uma lista da casca
 * (fork Escale, Fase 2B; migration 9102). `organization_id` e a pessoa saem da
 * sessão; a RLS decide o que cada um vê e grava.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { enxugarFiltros } from "@/lib/escale/contatos/filtros";
import {
  FILTROS_DA_LISTA_MAX,
  falhaDaGravacao,
  lerFiltrosDaLista,
  listaSchema,
  nomeLimpo,
  nomeRepetido,
  novoFiltroSchema,
} from "@/lib/escale/listas/filtros-salvos";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROTA = "/api/v1/filtros-das-listas";

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_filtros_das_listas" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lista = listaSchema.safeParse(req.nextUrl.searchParams.get("lista"));
  if (!lista.success) {
    return fail(
      "unprocessable_entity",
      t("Não consegui completar essa ação. Tente de novo."),
      422,
      {
        requestId,
      },
    );
  }
  try {
    const filtros = await lerFiltrosDaLista(
      await createClient(),
      authz.org.orgId,
      authz.user.id,
      lista.data,
    );
    return ok(filtros, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: `GET ${ROTA}`, operacao: "ler os filtros salvos" },
      t,
      requestId,
    );
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("viewer", { requestId, resource: "crm_filtros_das_listas" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = novoFiltroSchema.safeParse(corpo.json);
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
  const nome = nomeLimpo(lido.data.nome);
  if (!nome) {
    return fail("unprocessable_entity", t("Dê ao filtro um nome de 1 a 60 caracteres."), 422, {
      requestId,
    });
  }

  const orgId = authz.org.orgId;
  const userId = authz.user.id;
  try {
    const supabase = await createClient();
    const meus = (await lerFiltrosDaLista(supabase, orgId, userId, lido.data.lista)).filter(
      (f) => f.meu,
    );
    if (nomeRepetido(nome, meus)) {
      return fail("state_conflict", t("Já existe um filtro com esse nome."), 409, { requestId });
    }
    if (meus.length >= FILTROS_DA_LISTA_MAX) {
      return fail(
        "unprocessable_entity",
        t("Limite de 20 filtros salvos atingido. Exclua algum para salvar outro."),
        422,
        { requestId },
      );
    }
    const { data: criado, error } = await supabase
      .from("crm_filtros_das_listas")
      .insert({
        organization_id: orgId,
        user_id: userId,
        lista: lido.data.lista,
        nome,
        compartilhado: lido.data.compartilhado,
        criterios: enxugarFiltros(lido.data.criterios),
      })
      .select("id")
      .single();
    if (error || !criado) {
      return (
        (error && falhaDaGravacao(error, t, requestId)) ??
        falhaInesperadaDoQuadro(
          error,
          { rota: `POST ${ROTA}`, operacao: "salvar o filtro" },
          t,
          requestId,
        )
      );
    }
    const id = (criado as { id: string }).id;
    void audit({
      action: "list_filter.created",
      actorUserId: userId,
      organizationId: orgId,
      resourceType: "crm_filtros_das_listas",
      resourceId: id,
      requestId,
      metadata: { lista: lido.data.lista, compartilhado: lido.data.compartilhado },
    });
    const filtros = await lerFiltrosDaLista(supabase, orgId, userId, lido.data.lista);
    return ok({ id, filtros }, { status: 201, requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: `POST ${ROTA}`, operacao: "salvar o filtro" },
      t,
      requestId,
    );
  }
}
