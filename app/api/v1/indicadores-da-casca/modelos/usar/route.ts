import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { lerGraficos } from "@/lib/escale/indicadores/graficos/banco";
import { GRAFICOS_POR_PAINEL_MAX } from "@/lib/escale/indicadores/graficos/tipos";
import { criarPainelComGraficos, ErroDoModelo, lerTemplate, type NovoGraficoDeModelo } from "@/lib/escale/indicadores/modelos/banco";
import { aplicarFiltrosDoModelo, contarFiltros, filtrosDoModeloSchema, nomeDoPainelDoModelo } from "@/lib/escale/indicadores/modelos/regras";
import { modeloDoSistema } from "@/lib/escale/indicadores/modelos/sistema";
import { MODELOS_IDS } from "@/lib/escale/indicadores/modelos/tipos";
import { perguntaDoDivisorSchema, perguntaSchema, type FiltroFixo } from "@/lib/escale/indicadores/pergunta";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const corpoSchema = z
  .object({
    modelo: z.discriminatedUnion("origem", [
      z.object({ origem: z.literal("sistema"), id: z.enum(MODELOS_IDS) }).strict(),
      z.object({ origem: z.literal("organizacao"), id: z.string().uuid() }).strict(),
    ]),
    filtros: filtrosDoModeloSchema,
  })
  .strict();

const perguntaValida = (p: unknown): boolean => perguntaSchema.safeParse(p).success || perguntaDoDivisorSchema.safeParse(p).success;

/**
 * POST /api/v1/indicadores-da-casca/modelos/usar — cria "{modelo} 2" com os gráficos copiados e os filtros do
 * passo "Configure filtros" gravados em cada gráfico (fork Escale, Fase 7F). Gerente para cima.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = corpoSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) return fail("validation_failed", t("Falha na validação dos dados!"), 422, { requestId });
  const { modelo, filtros } = lido.data;
  const orgId = authz.org.orgId;

  try {
    const supabase = await createClient();
    let origem: { nome: string; cor: string; icone: string };
    let graficos: NovoGraficoDeModelo[];
    if (modelo.origem === "sistema") {
      const m = modeloDoSistema(modelo.id);
      if (!m) return fail("not_found", t("Template não encontrado. Recarregue e tente novamente."), 404, { requestId });
      origem = { nome: t(m.nome), cor: m.cor, icone: m.icone };
      graficos = m.graficos.map((g) => ({
        nome: t(g.nome),
        descricao: g.descricao ? t(g.descricao) : null,
        tipo: g.tipo,
        layout: g.layout,
        pergunta: g.pergunta,
        opcoes: g.opcoes,
      }));
    } else {
      const template = await lerTemplate(supabase, orgId, modelo.id);
      if (!template) return fail("not_found", t("Template não encontrado. Recarregue e tente novamente."), 404, { requestId });
      origem = { nome: template.nome, cor: template.cor, icone: template.icone };
      graficos = (await lerGraficos(supabase, orgId, template.id)).map((g) => ({
        nome: g.nome,
        descricao: g.descricao,
        tipo: g.tipo,
        layout: g.layout,
        pergunta: g.pergunta,
        opcoes: g.opcoes,
      }));
    }

    if (graficos.length > GRAFICOS_POR_PAINEL_MAX) return fail("state_conflict", mensagemDoLimite(t), 409, { requestId });
    const comFiltros = graficos.map((g) => ({ ...g, pergunta: aplicarFiltrosDoModelo(g.pergunta, filtros) }));
    if (!comFiltros.every((g) => perguntaValida(g.pergunta))) {
      return fail("validation_failed", t("Falha na validação dos dados!"), 422, { requestId });
    }

    const { id } = await criarPainelComGraficos(
      supabase,
      orgId,
      authz.user.id,
      { nome: nomeDoPainelDoModelo(origem.nome), cor: origem.cor, icone: origem.icone },
      comFiltros,
      { comoModelo: false },
    );
    const fixo = (comFiltros.find((g) => (g.pergunta as { filtroFixo?: FiltroFixo }).filtroFixo)?.pergunta as { filtroFixo?: FiltroFixo } | undefined)?.filtroFixo;
    void audit({
      action: "dashboard.created_from_template",
      actorUserId: authz.user.id,
      organizationId: orgId,
      resourceType: "dashboard",
      resourceId: id,
      requestId,
      metadata: { modelo: modelo.id, origem: modelo.origem, graficos: comFiltros.length, filtros: contarFiltros(fixo) },
    });
    return ok({ id }, { requestId, status: 201 });
  } catch (err) {
    if (err instanceof ErroDoModelo && err.motivo === "limite") return fail("state_conflict", mensagemDoLimite(t), 409, { requestId });
    logger.error("indicadores.modelo_usar_falhou", { requestId, motivo: (err as Error).message });
    return fail("internal_error", t("Falha ao criar dashboard a partir do template."), 500, { requestId });
  }
}

function mensagemDoLimite(t: (texto: string) => string): string {
  return t("Você só pode adicionar até {n} charts no seu dashboard. Para incluir novos, será necessário excluir um chart existente.").replace(
    "{n}",
    String(GRAFICOS_POR_PAINEL_MAX),
  );
}
