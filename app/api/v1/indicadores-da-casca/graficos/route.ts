import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { camposDaOrganizacao, objetosCitados } from "@/lib/escale/indicadores/campos-da-org";
import { novoGraficoSchema, TAMANHO_DO_NOVO } from "@/lib/escale/indicadores/editor/schema";
import { criarGrafico, ErroDoGrafico, lerLayoutsDoPainel } from "@/lib/escale/indicadores/graficos/banco";
import { posicaoNoFim } from "@/lib/escale/indicadores/graficos/regras-do-card";
import { GRAFICOS_POR_PAINEL_MAX, TAMANHO_DO_DIVISOR } from "@/lib/escale/indicadores/graficos/tipos";
import { lerPainel } from "@/lib/escale/indicadores/paineis/banco";
import { validarPergunta } from "@/lib/escale/indicadores/pergunta";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** POST /api/v1/indicadores-da-casca/graficos — cria um gráfico no fim da grade do painel (fork Escale, Fase 7D). Gerente para cima. */
export async function POST(req: NextRequest): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const lido = novoGraficoSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) {
    return fail("validation_failed", t("Falha na validação dos dados!"), 422, {
      requestId,
      details: lido.error.flatten().fieldErrors as Record<string, unknown>,
    });
  }
  const novo = lido.data;
  const orgId = authz.org.orgId;
  try {
    const supabase = await createClient();
    const camposDaOrg = await camposDaOrganizacao(supabase, orgId, objetosCitados(novo.pergunta));
    // O Divisor (T15) não tem pergunta para validar.
    if (!("divisor" in novo.pergunta)) {
      const validada = validarPergunta(novo.pergunta, camposDaOrg);
      if (!validada.ok) {
        return fail("validation_failed", t("Pergunta inválida."), 422, { requestId, details: { erro: validada.erro } });
      }
    }
    if (!(await lerPainel(supabase, orgId, novo.painelId, false))) {
      return fail("not_found", t("Dashboard não encontrado."), 404, { requestId });
    }
    const layouts = await lerLayoutsDoPainel(supabase, orgId, novo.painelId);
    const { id } = await criarGrafico(
      supabase,
      orgId,
      authz.user.id,
      novo,
      posicaoNoFim(layouts, novo.tipo === "divisor" ? TAMANHO_DO_DIVISOR.w : TAMANHO_DO_NOVO.w, novo.tipo === "divisor" ? TAMANHO_DO_DIVISOR.h : TAMANHO_DO_NOVO.h),
    );
    void audit({
      action: "dashboard.chart_created",
      actorUserId: authz.user.id,
      organizationId: orgId,
      resourceType: "dashboard_chart",
      resourceId: id,
      requestId,
      metadata: { painel: novo.painelId, tipo: novo.tipo },
    });
    return ok({ id }, { requestId, status: 201 });
  } catch (err) {
    if (err instanceof ErroDoGrafico && err.motivo === "limite") {
      return fail(
        "state_conflict",
        t("Você só pode adicionar até {n} charts no seu dashboard. Para incluir novos, será necessário excluir um chart existente.").replace(
          "{n}",
          String(GRAFICOS_POR_PAINEL_MAX),
        ),
        409,
        { requestId },
      );
    }
    logger.error("indicadores.grafico_criacao_falhou", { requestId, motivo: (err as Error).message });
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}
