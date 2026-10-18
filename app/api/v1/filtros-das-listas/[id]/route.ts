/**
 * PATCH/DELETE /api/v1/filtros-das-listas/[id] — renomear, compartilhar e excluir
 * um filtro salvo (fork Escale, Fase 2B). Só quem criou: o filtro é procurado
 * com `user_id` da sessão, e a RLS barra o resto.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import {
  falhaDaGravacao,
  lerFiltrosDaLista,
  listaSchema,
  mudarFiltroSchema,
  nomeLimpo,
  nomeRepetido,
  type ListaComFiltros,
} from "@/lib/escale/listas/filtros-salvos";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };
type Supabase = Awaited<ReturnType<typeof createClient>>;

async function inicio(req: NextRequest, ctx: Contexto) {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_filtros_das_listas" });
  if (!authz.ok) return { resposta: authz.response } as const;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return {
      resposta: fail(
        "unprocessable_entity",
        t("Não consegui completar essa ação. Tente de novo."),
        422,
        {
          requestId,
        },
      ),
    } as const;
  }
  return { requestId, authz, t, id } as const;
}

/** O meu filtro com esse id, ou null. */
async function meuFiltro(supabase: Supabase, orgId: string, userId: string, id: string) {
  const { data, error } = await supabase
    .from("crm_filtros_das_listas")
    .select("id, lista, nome")
    .eq("id", id)
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const lista = listaSchema.safeParse((data as { lista: string }).lista);
  return lista.success ? { id, lista: lista.data as ListaComFiltros } : null;
}

export async function PATCH(req: NextRequest, ctx: Contexto): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const c = await inicio(req, ctx);
  if (c.resposta) return c.resposta;
  const { requestId, authz, t, id } = c;
  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = mudarFiltroSchema.safeParse(corpo.json);
  if (!lido.success) {
    return fail(
      "unprocessable_entity",
      t("Não consegui completar essa ação. Tente de novo."),
      422,
      {
        requestId,
      },
    );
  }
  const orgId = authz.org.orgId;
  const userId = authz.user.id;
  try {
    const supabase = await createClient();
    const filtro = await meuFiltro(supabase, orgId, userId, id);
    if (!filtro) return fail("not_found", t("Filtro não encontrado."), 404, { requestId });
    let nome: string | undefined;
    if (lido.data.nome !== undefined) {
      const limpo = nomeLimpo(lido.data.nome);
      if (!limpo) {
        return fail("unprocessable_entity", t("Dê ao filtro um nome de 1 a 60 caracteres."), 422, {
          requestId,
        });
      }
      const meus = (await lerFiltrosDaLista(supabase, orgId, userId, filtro.lista)).filter(
        (f) => f.meu,
      );
      if (nomeRepetido(limpo, meus, id)) {
        return fail("state_conflict", t("Já existe um filtro com esse nome."), 409, { requestId });
      }
      nome = limpo;
    }
    const { error } = await supabase
      .from("crm_filtros_das_listas")
      .update({
        ...(nome !== undefined ? { nome } : {}),
        ...(lido.data.compartilhado !== undefined
          ? { compartilhado: lido.data.compartilhado }
          : {}),
      })
      .eq("id", id)
      .eq("organization_id", orgId)
      .eq("user_id", userId);
    if (error) {
      return (
        falhaDaGravacao(error, t, requestId) ??
        falhaInesperadaDoQuadro(
          error,
          { rota: "PATCH /api/v1/filtros-das-listas/[id]", operacao: "mudar o filtro" },
          t,
          requestId,
        )
      );
    }
    void audit({
      action: "list_filter.updated",
      actorUserId: userId,
      organizationId: orgId,
      resourceType: "crm_filtros_das_listas",
      resourceId: id,
      requestId,
      metadata: { lista: filtro.lista, campos: Object.keys(lido.data) },
    });
    return ok(await lerFiltrosDaLista(supabase, orgId, userId, filtro.lista), { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "PATCH /api/v1/filtros-das-listas/[id]", operacao: "mudar o filtro" },
      t,
      requestId,
    );
  }
}

export async function DELETE(req: NextRequest, ctx: Contexto): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const c = await inicio(req, ctx);
  if (c.resposta) return c.resposta;
  const { requestId, authz, t, id } = c;
  const orgId = authz.org.orgId;
  const userId = authz.user.id;
  try {
    const supabase = await createClient();
    const filtro = await meuFiltro(supabase, orgId, userId, id);
    if (!filtro) return fail("not_found", t("Filtro não encontrado."), 404, { requestId });
    const { error } = await supabase
      .from("crm_filtros_das_listas")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId)
      .eq("user_id", userId);
    if (error) {
      return falhaInesperadaDoQuadro(
        error,
        { rota: "DELETE /api/v1/filtros-das-listas/[id]", operacao: "excluir o filtro" },
        t,
        requestId,
      );
    }
    void audit({
      action: "list_filter.deleted",
      actorUserId: userId,
      organizationId: orgId,
      resourceType: "crm_filtros_das_listas",
      resourceId: id,
      requestId,
      metadata: { lista: filtro.lista },
    });
    return ok(await lerFiltrosDaLista(supabase, orgId, userId, filtro.lista), { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "DELETE /api/v1/filtros-das-listas/[id]", operacao: "excluir o filtro" },
      t,
      requestId,
    );
  }
}
