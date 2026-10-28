import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { listaParaGravar, membrosAtivos } from "@/lib/escale/acesso/membros";
import { FalhaDoPainel, editarPainel, excluirPainel, lerPainel } from "@/lib/escale/indicadores/paineis/banco";
import { continuaVendo } from "@/lib/escale/indicadores/paineis/regras";
import { edicaoDoPainelSchema } from "@/lib/escale/indicadores/paineis/schema";
import type { EdicaoDoPainel } from "@/lib/escale/indicadores/paineis/tipos";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

const ehUuid = (id: string): boolean => z.string().uuid().safeParse(id).success;

/**
 * PATCH /api/v1/indicadores-da-casca/paineis/:id — nome, cor, ícone e permissões
 * (fork Escale, Fase 7B). Gerente para cima, com a sessão (a RLS da 9601 vale).
 * Gerente não salva listas que o tirem do painel (Q5): o Postgres recusaria com
 * o erro cru da RLS (invariante da 9602), aqui sai um 422 claro.
 */
export async function PATCH(req: NextRequest, ctx: Contexto): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!ehUuid(id)) return fail("not_found", t("Dashboard não encontrado."), 404, { requestId });
  const lido = edicaoDoPainelSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) return fail("validation_failed", t("Falha na validação dos dados!"), 422, { requestId });
  try {
    const supabase = await createClient();
    const painel = await lerPainel(supabase, authz.org.orgId, id);
    if (!painel) return fail("not_found", t("Dashboard não encontrado."), 404, { requestId });

    const edicao: Partial<EdicaoDoPainel> = { ...lido.data };
    if (lido.data.permissoesUsuarios !== undefined) {
      const membros = await membrosAtivos(supabase, authz.org.orgId);
      if (!membros.ok) throw new Error(membros.causa.message);
      const lista = listaParaGravar(lido.data.permissoesUsuarios, membros.ids, painel.permissoesUsuarios);
      if (!lista.ok) return fail("validation_failed", t(lista.erro), 422, { requestId });
      edicao.permissoesUsuarios = lista.lista ?? [];
    }
    const usuarios = edicao.permissoesUsuarios ?? painel.permissoesUsuarios;
    const papeis = edicao.permissoesPapeis ?? painel.permissoesPapeis;
    if (!continuaVendo({ id: authz.user.id, papel: authz.org.role }, usuarios, papeis)) {
      return fail(
        "validation_failed",
        t("Inclua você ou o seu papel para continuar vendo este dashboard."),
        422,
        { requestId },
      );
    }

    await editarPainel(supabase, authz.org.orgId, id, edicao);
    void audit({
      action: "dashboard.updated",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "dashboard",
      resourceId: id,
      requestId,
      metadata: { campos: Object.keys(lido.data) },
    });
    return ok({ id }, { requestId });
  } catch (err) {
    console.error("[indicadores-da-casca] editar painel", requestId, err);
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}

const FALHAS = {
  painel_protegido: { codigo: "conflict", texto: "Não é possível excluir um dashboard padrão ou template.", status: 409 },
  nao_encontrado: { codigo: "not_found", texto: "Dashboard não encontrado.", status: 404 },
  sem_permissao: { codigo: "forbidden", texto: "Sem permissão.", status: 403 },
} as const;

/** DELETE /api/v1/indicadores-da-casca/paineis/:id — exclusão suave (9602). Gerente para cima. */
export async function DELETE(_req: NextRequest, ctx: Contexto): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!ehUuid(id)) return fail("not_found", t("Dashboard não encontrado."), 404, { requestId });
  try {
    await excluirPainel(await createClient(), id);
    void audit({
      action: "dashboard.deleted",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "dashboard",
      resourceId: id,
      requestId,
    });
    return ok({ id }, { requestId });
  } catch (err) {
    if (err instanceof FalhaDoPainel) {
      const f = FALHAS[err.codigo];
      return fail(f.codigo, t(f.texto), f.status, { requestId });
    }
    console.error("[indicadores-da-casca] excluir painel", requestId, err);
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}
