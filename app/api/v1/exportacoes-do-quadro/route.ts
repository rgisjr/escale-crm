/**
 * POST /api/v1/exportacoes-do-quadro — registra na auditoria que alguém exportou
 * os cards de uma origem (fork Escale, Fase 1E).
 *
 * O CSV é montado no navegador, com o que a tela já mostra (o filtro aplicado e
 * a RLS de quem olha). Esta rota é a trava de papel — exportar em massa é
 * gerente ou acima, como a permissão de exportar da Clint — e o rastro (melhor
 * esforço, como toda auditoria do produto: `audit()` não lança): a tela
 * só baixa o arquivo depois do 201.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const corpoSchema = z
  .object({
    origem: z.string().uuid(),
    quantidade: z.number().int().min(0).max(100_000),
  })
  .strict();

export async function POST(req: NextRequest): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_leads" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = corpoSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail(
      "unprocessable_entity",
      t("Não consegui completar essa ação. Tente de novo."),
      422,
      {
        requestId,
        details: parsed.error.flatten(),
      },
    );
  }

  const supabase = await createClient();
  const { data: origem, error } = await supabase
    .from("crm_pipelines")
    .select("id")
    .eq("organization_id", authz.org.orgId)
    .eq("id", parsed.data.origem)
    .maybeSingle();
  if (error) {
    // A mensagem crua do banco vai para o log, nunca para o cliente (regra da 1D).
    return falhaInesperadaDoQuadro(
      error,
      { rota: "POST /api/v1/exportacoes-do-quadro", operacao: "conferir a origem" },
      t,
      requestId,
    );
  }
  if (!origem) return fail("not_found", t("Origem não encontrada."), 404, { requestId });

  // `await` de propósito: o registro é tentado antes do 201. `audit()` não lança
  // (a falha vira reportAuditFailure, a doutrina do produto), então a trava é o
  // papel e a origem; o rastro é melhor esforço.
  await audit({
    action: "pipeline.cards_exported",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_pipeline",
    resourceId: origem.id,
    requestId,
    metadata: { quantidade: parsed.data.quantidade },
  });
  return ok({ registrado: true }, { status: 201, requestId });
}
