/**
 * PATCH/DELETE /api/v1/pipeline-views/[id] — mudar e excluir uma VISUALIZAÇÃO de
 * origens (fork Escale, Fase 1C). Gerente+.
 *
 * PATCH é parcial (nome, acesso, origens, pessoas): o que não veio fica como
 * está — menos as origens arquivadas ou apagadas, que saem na gravação (o quadro
 * já não as mostrava). DELETE apaga a visualização; as listas vão junto (FK
 * cascade) e nenhuma origem ou negócio é tocado. Visualização de outra
 * organização morre no 404 antes de qualquer escrita.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { lerJson, origensOuFalha } from "@/lib/escale/origens/respostas";
import {
  ACESSOS_DE_VISUALIZACAO,
  montarGravacao,
  origensQueASessaoNaoVe,
  origensVivasDaVisualizacao,
  VISUALIZACAO_MAX_ORIGENS,
} from "@/lib/escale/visualizacoes/regras";
import {
  falhaDaGravacao,
  responderComVisualizacoes,
  visualizacoesOuFalha,
} from "@/lib/escale/visualizacoes/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const corpoSchema = z
  .object({
    name: z.string().max(200).optional(),
    acesso: z.enum(ACESSOS_DE_VISUALIZACAO).optional(),
    origens: z.array(z.string().uuid()).max(100).optional(),
    pessoas: z.array(z.string().uuid()).max(500).optional(),
  })
  .strict()
  .refine((b) => Object.keys(b).length > 0);

export async function PATCH(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipeline_views" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = corpoSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }

  const supabase = await createClient();
  const [origens, visualizacoes] = await Promise.all([
    origensOuFalha(supabase, orgId, requestId),
    visualizacoesOuFalha(supabase, orgId, requestId),
  ]);
  if (!origens.ok) return origens.resposta;
  if (!visualizacoes.ok) return visualizacoes.resposta;

  const atual = visualizacoes.visualizacoes.find((v) => v.id === id);
  if (!atual) return fail("not_found", t("Visualização não encontrada."), 404, { requestId });

  const veredito = montarGravacao(
    {
      name: parsed.data.name ?? atual.name,
      acesso: parsed.data.acesso ?? atual.acesso,
      origens: parsed.data.origens ?? origensVivasDaVisualizacao(atual, origens.origens).map((f) => f.id),
      pessoas: parsed.data.pessoas ?? atual.pessoas,
    },
    origens.origens,
    visualizacoes.visualizacoes,
    id,
  );
  if (!veredito.ok) return fail("unprocessable_entity", t(veredito.erro), 422, { requestId });
  const { gravacao } = veredito;

  // A função regrava a lista inteira. Origem que a RLS esconde desta sessão (gerente sem
  // acesso a ela) não está na lista lida: sem preservá-la, qualquer edição a apagaria da
  // visualização para todo mundo. Ela segue no fim, na posição que ainda não ocupa.
  const invisiveis = origensQueASessaoNaoVe(atual, origens.origens);
  const origensGravadas = [...gravacao.origens, ...invisiveis];
  if (origensGravadas.length > VISUALIZACAO_MAX_ORIGENS)
    return fail("unprocessable_entity", t("Uma visualização junta de 1 a 20 origens."), 422, {
      requestId,
    });

  const { error } = await supabase.rpc("fn_escale_salvar_visualizacao", {
    p_id: id,
    p_org: orgId,
    p_nome: gravacao.nome,
    p_acesso: gravacao.acesso,
    p_origens: origensGravadas,
    p_pessoas: gravacao.pessoas,
  });
  if (error) return falhaDaGravacao(error, t, requestId);

  void audit({
    action: "pipeline_view.updated",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline_view",
    resourceId: id,
    requestId,
    metadata: { campos: Object.keys(parsed.data), acesso: gravacao.acesso, origens: gravacao.origens.length },
  });

  return responderComVisualizacoes(supabase, orgId, requestId);
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipeline_views" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;

  const supabase = await createClient();
  const visualizacoes = await visualizacoesOuFalha(supabase, orgId, requestId);
  if (!visualizacoes.ok) return visualizacoes.resposta;
  const atual = visualizacoes.visualizacoes.find((v) => v.id === id);
  if (!atual) return fail("not_found", t("Visualização não encontrada."), 404, { requestId });

  const { error } = await supabase.from("crm_pipeline_views").delete().eq("id", id).eq("organization_id", orgId);
  if (error) return fail("internal_error", error.message, 500, { requestId });

  void audit({
    action: "pipeline_view.deleted",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline_view",
    resourceId: id,
    requestId,
    metadata: { name: atual.name },
  });

  return responderComVisualizacoes(supabase, orgId, requestId);
}
