/**
 * GET /api/v1/pipelines/:id/distribuicao/feitas — as distribuições feitas
 * (fork Escale, Fase 1K; a janela "Histórico de distribuições" da Clint, aberta
 * pelo contador). Gerente ou acima, com a sessão: a RLS da 9013 e a de
 * `crm_leads` (1J) valem juntas. Filtros: pessoa, busca no título do negócio
 * (N14), período de 7 ou 30 dias; 6 por página, a mais nova primeiro.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperada } from "@/lib/escale/configuracoes/respostas";
import type { DistribuicaoFeita } from "@/lib/escale/distribuicao/ler";
import { POR_PAGINA_DAS_DISTRIBUICOES } from "@/lib/escale/distribuicao/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const DIA_MS = 24 * 60 * 60 * 1000;

const filtrosSchema = z.object({
  usuario: z.union([z.literal(""), z.string().uuid()]).default(""),
  busca: z.string().max(80).default(""),
  periodo: z.enum(["", "7", "30"]).default(""),
  pagina: z.coerce.number().int().min(1).max(10_000).default(1),
});

export async function GET(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("not_found", t("Origem não encontrada."), 404, { requestId });
  }
  const filtros = filtrosSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!filtros.success) {
    return fail(
      "unprocessable_entity",
      t("Não consegui completar essa ação. Tente de novo."),
      422,
      { requestId },
    );
  }
  const { usuario, busca, periodo, pagina } = filtros.data;
  const de = (pagina - 1) * POR_PAGINA_DAS_DISTRIBUICOES;

  let q = (await createClient())
    .from("crm_distribuicoes_feitas")
    .select("id, user_id, distribuido_em, crm_leads!inner(id, title, crm_stages(name))", {
      count: "exact",
    })
    .eq("organization_id", authz.org.orgId)
    .eq("pipeline_id", id)
    .order("distribuido_em", { ascending: false })
    // Distribuições em lote empatam no instante: sem desempate a página 2 repete ou pula linhas.
    .order("id", { ascending: false })
    .range(de, de + POR_PAGINA_DAS_DISTRIBUICOES - 1);
  if (usuario) q = q.eq("user_id", usuario);
  if (periodo)
    q = q.gte("distribuido_em", new Date(Date.now() - Number(periodo) * DIA_MS).toISOString());
  const termo = busca.replace(/[%_,()]/g, " ").trim();
  if (termo) q = q.ilike("crm_leads.title", `%${termo}%`);

  const { data, error, count } = await q;
  if (error) {
    return falhaInesperada(
      error,
      { rota: "GET /api/v1/pipelines/[id]/distribuicao/feitas", operacao: "ler" },
      t,
      requestId,
    );
  }
  const itens: DistribuicaoFeita[] = ((data ?? []) as Array<Record<string, unknown>>).map((l) => {
    const lead = (l.crm_leads ?? {}) as {
      id?: string;
      title?: string;
      crm_stages?: { name?: string } | null;
    };
    return {
      id: String(l.id),
      leadId: String(lead.id ?? ""),
      titulo: lead.title ?? "",
      etapa: lead.crm_stages?.name ?? null,
      userId: typeof l.user_id === "string" ? l.user_id.toLowerCase() : null,
      em: String(l.distribuido_em),
    };
  });
  return ok({ itens, total: count ?? itens.length }, { requestId });
}
