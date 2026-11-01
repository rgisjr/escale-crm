import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { lerExecucoes } from "@/lib/escale/automacoes/insights/banco";
import { TETO_DO_CSV_DAS_EXECUCOES } from "@/lib/escale/automacoes/insights/csv";
import { comRegraDosInsights, recusaDeValidacao } from "@/lib/escale/automacoes/insights/rotas";
import { filtroDasExecucoesSchema, pedidoDeExecucoes } from "@/lib/escale/automacoes/insights/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/automacoes-da-casca/:id/execucoes/exportar — as linhas do "Exportar CSV" da
 * listagem (fork Escale, Fase 5C; I13). Os mesmos filtros da listagem, na hora, até 5.000
 * linhas; acima disso, 422. O CSV é montado na tela, porque a frase do motivo vive num módulo
 * de cliente (`explicacaoDe`). Leitura auditada.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  return comRegraDosInsights(ctx, "exportar", async (c) => {
    const lido = filtroDasExecucoesSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!lido.success) return recusaDeValidacao(c);
    const pedido = pedidoDeExecucoes(lido.data, new Date(), TETO_DO_CSV_DAS_EXECUCOES + 1, 0);
    const { linhas } = await lerExecucoes(c.supabase, c.regra.id, pedido);
    if (linhas.length > TETO_DO_CSV_DAS_EXECUCOES) {
      return fail(
        "lista_grande_demais",
        c.t("A lista tem mais de 5.000 execuções. Refine os filtros para exportar um conjunto menor."),
        422,
        { requestId: c.requestId },
      );
    }
    void audit({
      action: "automation.runs_exported",
      actorUserId: c.authz.user.id,
      organizationId: c.authz.org.orgId,
      resourceType: "automation_rule",
      resourceId: c.regra.id,
      requestId: c.requestId,
      metadata: { linhas: linhas.length, periodo: lido.data.periodo },
    });
    return ok({ linhas, acoes: c.regra.actions, nome: c.regra.name }, {
      requestId: c.requestId,
      headers: { "cache-control": "no-store" },
    });
  });
}
