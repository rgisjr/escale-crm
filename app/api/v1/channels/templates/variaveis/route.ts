import { requireSupportWrite } from "@/lib/impersonate/support";
/**
 * PATCH /api/v1/channels/templates/variaveis — salva de onde vem cada `{{n}}`
 * de um modelo (fork Escale, Frente V; a janela "Modelo de mensagem").
 *
 * Mesmo desenho do `PATCH` de `saved_values` em `../route.ts`: só
 * administrador, bloqueado em sessão de suporte, e grava em TODAS as linhas do
 * mesmo nome e idioma da organização (a tela lista o modelo uma vez só). Cada
 * linha é conferida contra o SEU contrato antes de qualquer escrita, e guarda
 * o `contract_hash` de hoje em `variaveis_contrato` (D12).
 */
import { randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { deriveTemplateContract } from "@/lib/channels/meta/template-contract";
import { createAdminClient } from "@/lib/supabase/admin";
import { validarMapeamento, type MapeamentoDoModelo } from "@/lib/variaveis/mapeamento";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const corpoSchema = z
  .object({ name: z.string().min(1).max(512), language: z.string().min(2).max(16), variaveis: z.unknown() })
  .strict();

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("admin", { requestId, resource: "channels_templates" });
  if (!authz.ok) return authz.response;
  const orgId = authz.org.orgId;

  const corpo = corpoSchema.safeParse(await req.json().catch(() => null));
  if (!corpo.success) {
    return fail("validation_failed", "esperado { name, language, variaveis }", 422, { requestId });
  }

  const admin = createAdminClient();
  const { data: linhas, error } = await admin
    .from("meta_templates")
    .select("id, name, language, parameter_format, components, contract_hash")
    .eq("organization_id", orgId)
    .eq("name", corpo.data.name)
    .eq("language", corpo.data.language);
  if (error) return fail("internal_error", error.message, 500, { requestId });
  if (!linhas || linhas.length === 0) return fail("not_found", "modelo não encontrado", 404, { requestId });

  // Confere TUDO antes de escrever: recusar a segunda linha depois de gravar a
  // primeira deixaria os números divergindo.
  const planos: Array<{ id: string; mapa: MapeamentoDoModelo; hash: string }> = [];
  for (const linha of linhas) {
    const contrato = deriveTemplateContract({
      name: linha.name,
      language: linha.language,
      parameter_format: linha.parameter_format,
      components: linha.components as never,
    });
    const v = validarMapeamento(contrato, corpo.data.variaveis);
    if (!v.ok) {
      return fail("validation_failed", "Corrija o valor destacado para salvar.", 422, {
        requestId,
        details: { erros: v.erros },
      });
    }
    planos.push({ id: linha.id, mapa: v.mapa, hash: linha.contract_hash });
  }

  for (const plano of planos) {
    const { error: erro } = await admin
      .from("meta_templates")
      .update({ variaveis: plano.mapa, variaveis_contrato: plano.hash })
      .eq("organization_id", orgId)
      .eq("id", plano.id);
    if (erro) return fail("internal_error", erro.message, 500, { requestId });
  }

  return ok({ variaveis: planos[0]!.mapa });
}
