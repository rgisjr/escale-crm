import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { camposDaOrganizacao, objetosCitados } from "@/lib/escale/indicadores/campos-da-org";
import { edicaoDoGraficoSchema, TAMANHO_DO_NOVO } from "@/lib/escale/indicadores/editor/schema";
import {
  atualizarGrafico,
  contarGraficosVivos,
  excluirGrafico,
  lerGrafico,
  lerLayoutsDoPainel,
} from "@/lib/escale/indicadores/graficos/banco";
import { posicaoNoFim } from "@/lib/escale/indicadores/graficos/regras-do-card";
import { GRAFICOS_POR_PAINEL_MAX, type LayoutDoGrafico } from "@/lib/escale/indicadores/graficos/tipos";
import { lerPainel } from "@/lib/escale/indicadores/paineis/banco";
import { validarPergunta } from "@/lib/escale/indicadores/pergunta";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** DELETE /api/v1/indicadores-da-casca/graficos/:id — exclui o gráfico, definitivo como na Clint (R5). Gerente para cima. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("not_found", t("Chart não encontrado."), 404, { requestId });
  }
  try {
    const supabase = await createClient();
    if (!(await excluirGrafico(supabase, authz.org.orgId, id))) {
      return fail("not_found", t("Chart não encontrado."), 404, { requestId });
    }
    void audit({
      action: "dashboard.chart_deleted",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "dashboard_chart",
      resourceId: id,
      requestId,
    });
    return ok({ id }, { requestId });
  } catch (err) {
    logger.error("indicadores.grafico_exclusao_falhou", { requestId, motivo: (err as Error).message });
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}

const TEXTO_DO_LIMITE =
  "Você só pode adicionar até {n} charts no seu dashboard. Para incluir novos, será necessário excluir um chart existente.";

/**
 * PATCH /api/v1/indicadores-da-casca/graficos/:id — atualiza o gráfico, ou o move de painel (fork Escale, Fase 7D).
 * O gatilho do limite de 30 é só de `insert`, então ao mover a rota conta os gráficos do destino (S16).
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("not_found", t("Chart não encontrado."), 404, { requestId });
  }
  const lido = edicaoDoGraficoSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) {
    return fail("validation_failed", t("Falha na validação dos dados!"), 422, {
      requestId,
      details: lido.error.flatten().fieldErrors as Record<string, unknown>,
    });
  }
  const edicao = lido.data;
  const orgId = authz.org.orgId;
  try {
    const supabase = await createClient();
    if (edicao.pergunta) {
      const camposDaOrg = await camposDaOrganizacao(supabase, orgId, objetosCitados(edicao.pergunta));
      const validada = validarPergunta(edicao.pergunta, camposDaOrg);
      if (!validada.ok) {
        return fail("validation_failed", t("Pergunta inválida."), 422, { requestId, details: { erro: validada.erro } });
      }
    }
    const atual = await lerGrafico(supabase, orgId, id);
    if (!atual) return fail("not_found", t("Chart não encontrado."), 404, { requestId });

    let layout: LayoutDoGrafico | undefined;
    if (edicao.painelId && edicao.painelId !== atual.painelId) {
      if (!(await lerPainel(supabase, orgId, edicao.painelId, false))) {
        return fail("not_found", t("Dashboard não encontrado."), 404, { requestId });
      }
      if ((await contarGraficosVivos(supabase, orgId, edicao.painelId)) >= GRAFICOS_POR_PAINEL_MAX) {
        return fail("state_conflict", t(TEXTO_DO_LIMITE).replace("{n}", String(GRAFICOS_POR_PAINEL_MAX)), 409, { requestId });
      }
      layout = posicaoNoFim(await lerLayoutsDoPainel(supabase, orgId, edicao.painelId), TAMANHO_DO_NOVO.w, TAMANHO_DO_NOVO.h);
    }
    const { painelId, ...resto } = edicao;
    const mudou = await atualizarGrafico(supabase, orgId, id, {
      ...resto,
      ...(layout ? { painelId, layout } : {}),
    });
    if (!mudou) return fail("not_found", t("Chart não encontrado."), 404, { requestId });
    void audit({
      action: "dashboard.chart_updated",
      actorUserId: authz.user.id,
      organizationId: orgId,
      resourceType: "dashboard_chart",
      resourceId: id,
      requestId,
      metadata: { campos: Object.keys(edicao) },
    });
    return ok({ id }, { requestId });
  } catch (err) {
    logger.error("indicadores.grafico_edicao_falhou", { requestId, motivo: (err as Error).message });
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}
