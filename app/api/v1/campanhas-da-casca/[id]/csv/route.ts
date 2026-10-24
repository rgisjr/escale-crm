import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { ehIdDeCampanha, lerDestinatarios } from "@/lib/escale/campanhas/detalhe/banco";
import {
  TETO_DO_CSV,
  csvDaCampanha,
  nomeDoCsvDaCampanha,
} from "@/lib/escale/campanhas/detalhe/csv";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/campanhas-da-casca/:id/csv — o "Baixar .CSV" do detalhe (fork
 * Escale, Fase 8C; N14). Gerente; a campanha inteira, até 20.000 linhas, na
 * hora (a Clint gera em segundo plano; pergunta Q1 do plano). Auditado.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  const naoAchou = () =>
    fail("campanha_nao_encontrada", t("Campanha não encontrada."), 404, { requestId });
  if (!ehIdDeCampanha(id)) return naoAchou();
  try {
    const supabase = await createClient();
    const { data: campanha } = await supabase
      .from("campaigns")
      .select("id, name")
      .eq("organization_id", authz.org.orgId)
      .eq("id", id)
      .maybeSingle();
    if (!campanha) return naoAchou();
    const fuso = await fusoDaOrganizacao(supabase, authz.org.orgId);
    const pagina = await lerDestinatarios(supabase, authz.org.orgId, id, {}, 1, TETO_DO_CSV);
    void audit({
      action: "campaign.exported",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "campaigns",
      resourceId: id,
      requestId,
      metadata: { linhas: pagina.linhas.length, parcial: pagina.total > pagina.linhas.length },
    });
    const nome = nomeDoCsvDaCampanha((campanha as { name: string }).name, new Date(), fuso);
    return new Response(csvDaCampanha(pagina.linhas, t, fuso), {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${nome}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
