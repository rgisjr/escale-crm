/**
 * PUT /api/v1/pipelines/:id/etapas-e-atividades — o "Salvar na origem" da aba
 * Etapas e atividades (fork Escale, Fase 1L): grava de uma vez as etapas editadas
 * (criar, renomear, descrever, reordenar, excluir) e o playbook, na ordem certa.
 *
 * AQUI SÓ HÁ TRANSPORTE: a ordem e as regras vivem em `lib/escale/etapas/gravar.ts`,
 * que chama as operações de etapa que o agente de IA e a tela de funis já usam.
 * Gerente ou acima; `organization_id` sai da sessão, nunca do corpo.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { respostaDeRecusa } from "@/lib/api/recusa";
import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { gravarEtapasEAtividades, pedidoDeEtapasSchema } from "@/lib/escale/etapas/gravar";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_stages" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("not_found", t("Origem não encontrada."), 404, { requestId });
  }

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = pedidoDeEtapasSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail(
      "unprocessable_entity",
      t("Não consegui completar essa ação. Tente de novo."),
      422,
      { requestId, details: parsed.error.flatten() },
    );
  }

  try {
    const gravado = await gravarEtapasEAtividades(
      {
        supabase: await createClient(),
        organizationId: authz.org.orgId,
        actor: { type: "user", id: authz.user.id, role: authz.org.role },
        requestId,
      },
      { pipelineId: id, pedido: parsed.data },
    );
    return ok(gravado, { requestId });
  } catch (err) {
    return respostaDeRecusa(err, requestId);
  }
}
