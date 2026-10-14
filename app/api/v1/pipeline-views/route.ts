/**
 * GET/POST /api/v1/pipeline-views — lista / cria uma VISUALIZAÇÃO de origens
 * (fork Escale, Fase 1C).
 *
 * GET: qualquer papel; a RLS decide quais visualizações a pessoa vê. POST:
 * gerente+. O `id` vem da tela (uuid novo), para ela já saber para onde ir depois
 * de criar. A `organization_id` sai da sessão, nunca do corpo. A gravação é
 * `fn_escale_salvar_visualizacao` (uma transação, como quem chama).
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { lerJson, origensOuFalha } from "@/lib/escale/origens/respostas";
import { ACESSOS_DE_VISUALIZACAO, montarGravacao } from "@/lib/escale/visualizacoes/regras";
import {
  falhaDaGravacao,
  responderComVisualizacoes,
  visualizacoesOuFalha,
} from "@/lib/escale/visualizacoes/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const corpoSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().max(200),
    acesso: z.enum(ACESSOS_DE_VISUALIZACAO),
    origens: z.array(z.string().uuid()).max(100),
    pessoas: z.array(z.string().uuid()).max(500).default([]),
  })
  .strict();

export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_pipeline_views" });
  if (!authz.ok) return authz.response;
  return responderComVisualizacoes(await createClient(), authz.org.orgId, requestId);
}

export async function POST(req: NextRequest): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipeline_views" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;

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

  const veredito = montarGravacao(parsed.data, origens.origens, visualizacoes.visualizacoes, null);
  if (!veredito.ok) return fail("unprocessable_entity", t(veredito.erro), 422, { requestId });
  const { gravacao } = veredito;

  const { error } = await supabase.rpc("fn_escale_salvar_visualizacao", {
    p_id: parsed.data.id,
    p_org: orgId,
    p_nome: gravacao.nome,
    p_acesso: gravacao.acesso,
    p_origens: gravacao.origens,
    p_pessoas: gravacao.pessoas,
  });
  if (error) return falhaDaGravacao(error, t, requestId);

  void audit({
    action: "pipeline_view.created",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline_view",
    resourceId: parsed.data.id,
    requestId,
    metadata: { name: gravacao.nome, acesso: gravacao.acesso, origens: gravacao.origens.length },
  });

  return responderComVisualizacoes(supabase, orgId, requestId, 201);
}
