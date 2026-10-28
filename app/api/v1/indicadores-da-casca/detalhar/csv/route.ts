import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { camposDaOrganizacao, objetosCitados } from "@/lib/escale/indicadores/campos-da-org";
import { csvDoDetalhamento } from "@/lib/escale/indicadores/graficos/detalhamento";
import { ErroDoMotor } from "@/lib/escale/indicadores/motor/erros";
import { detalharParaCsv } from "@/lib/escale/indicadores/motor/executar";
import { comVaga } from "@/lib/escale/indicadores/motor/fila";
import { detalhamentoParaCsvSchema, validarDetalhamento } from "@/lib/escale/indicadores/pergunta";
import { traduzir } from "@/lib/i18n/dicionario";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/indicadores-da-casca/detalhar/csv — o "Exportar .CSV" do detalhamento (fork Escale,
 * Fase 7E; T9): na hora, até 20.000 linhas, como o CSV da campanha (8C). Auditado.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "indicadores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const lido = detalhamentoParaCsvSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) {
    return fail("validation_failed", t("Falha na validação dos dados!"), 422, {
      requestId,
      details: lido.error.flatten().fieldErrors as Record<string, unknown>,
    });
  }
  if (!process.env.SUPABASE_DB_URL) {
    return fail("upstream_unavailable", t("Os indicadores estão indisponíveis neste ambiente."), 503, { requestId });
  }
  const pedido = lido.data;
  const orgId = authz.org.orgId;
  try {
    const supabase = await createClient();
    const [camposDaOrg, fuso] = await Promise.all([
      camposDaOrganizacao(supabase, orgId, objetosCitados(pedido)),
      fusoDaOrganizacao(supabase, orgId, authz.org.timezone),
    ]);
    const validado = validarDetalhamento(pedido, camposDaOrg);
    if (!validado.ok) {
      const mensagem = validado.semDetalhe ? t("Essa métrica ainda não suporta detalhamento.") : t("Pergunta inválida.");
      return fail("validation_failed", mensagem, 422, { requestId, details: { erro: validado.erro } });
    }
    const linhas: Record<string, unknown>[] = [];
    const resumo = await comVaga(authz.user.id, () =>
      detalharParaCsv(getRequestPool(), { orgId, userId: authz.user.id, fuso }, pedido, (l) => linhas.push(l), { camposDaOrg }),
    );
    void audit({
      action: "dashboard.chart_drilldown_exported",
      actorUserId: authz.user.id,
      organizationId: orgId,
      resourceType: "crm_graficos",
      requestId,
      metadata: { indicador: pedido.indicador, linhas: resumo.linhas, truncado: resumo.truncado },
    });
    const hoje = new Date();
    const dia = (n: number) => String(n).padStart(2, "0");
    const nome = `${t("Detalhamento")} - ${pedido.indicador} - ${dia(hoje.getDate())}-${dia(hoje.getMonth() + 1)}-${hoje.getFullYear()}.csv`;
    return new Response(csvDoDetalhamento(resumo.colunas, linhas, fuso, t), {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${nome.replace(/[^\w .\-()]/g, "_")}"`,
        "cache-control": "no-store",
        ...(resumo.truncado ? { "x-escale-truncado": "1" } : {}),
      },
    });
  } catch (err) {
    if (err instanceof ErroDoMotor) {
      if (err.codigo === "consulta_demorou") {
        return fail("consulta_demorou", t("A consulta demorou mais de 8 segundos. Tente um período menor."), 504, { requestId });
      }
      if (err.codigo === "fila_cheia") {
        return fail("fila_cheia", t("Muitas consultas ao mesmo tempo. Aguarde um instante."), 429, { requestId });
      }
      if (err.codigo === "pergunta_invalida" || err.codigo === "sem_detalhamento") {
        return fail("validation_failed", t("Pergunta inválida."), 422, { requestId, details: { erro: err.message } });
      }
    }
    logger.error("indicadores.detalhar_csv_falhou", { requestId, motivo: (err as Error).message });
    return fail("internal_error", t("Não foi possível consultar os indicadores agora."), 500, { requestId });
  }
}
