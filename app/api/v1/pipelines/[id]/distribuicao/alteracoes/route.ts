/**
 * GET /api/v1/pipelines/:id/distribuicao/alteracoes — o histórico da
 * configuração da distribuição (fork Escale, Fase 1K; a gaveta do relógio da
 * Clint, `Ms`). Gerente ou acima, com a sessão (RLS da 9013). As 200 mais novas.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperada } from "@/lib/escale/configuracoes/respostas";
import {
  EVENTOS_DA_DISTRIBUICAO,
  type AlteracaoDaDistribuicao,
} from "@/lib/escale/distribuicao/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("not_found", t("Origem não encontrada."), 404, { requestId });
  }
  const { data, error } = await (
    await createClient()
  )
    .from("crm_distribuicao_alteracoes")
    .select("id, evento, pessoa_id, percentual_antes, percentual_depois, autor_id, created_at")
    .eq("organization_id", authz.org.orgId)
    .eq("pipeline_id", id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    return falhaInesperada(
      error,
      { rota: "GET /api/v1/pipelines/[id]/distribuicao/alteracoes", operacao: "ler" },
      t,
      requestId,
    );
  }
  const numero = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const alteracoes: AlteracaoDaDistribuicao[] = ((data ?? []) as Array<Record<string, unknown>>)
    .filter((l) => (EVENTOS_DA_DISTRIBUICAO as readonly string[]).includes(String(l.evento)))
    .map((l) => ({
      id: String(l.id),
      evento: l.evento as AlteracaoDaDistribuicao["evento"],
      pessoaId: typeof l.pessoa_id === "string" ? l.pessoa_id.toLowerCase() : null,
      percentualAntes: numero(l.percentual_antes),
      percentualDepois: numero(l.percentual_depois),
      autorId: typeof l.autor_id === "string" ? l.autor_id.toLowerCase() : null,
      em: String(l.created_at),
    }));
  return ok(alteracoes, { requestId });
}
