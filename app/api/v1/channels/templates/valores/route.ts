/**
 * POST /api/v1/channels/templates/valores — os valores do modelo para o
 * contato de uma conversa, pelo mapeamento salvo (fork Escale, Frente V; D13).
 *
 * Só leitura. A conversa passa pela RLS da sessão (fora do alcance, 404). O
 * "Usuário" é quem envia. Slot sem mapeamento volta em `slotsSemMapa` (a tela
 * mantém o campo de digitar); slot mapeado sem valor nem alternativo volta em
 * `faltando` (a tela barra o envio).
 */
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { deriveTemplateContract } from "@/lib/channels/meta/template-contract";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { FUSO_PADRAO } from "@/lib/tempo/fusos";
import { TOKEN_DA_SAUDACAO } from "@/lib/variaveis/catalogo";
import { fontesDaConversa } from "@/lib/variaveis/fontes-da-conversa";
import {
  mapeamentoAtual,
  slotsDoMapeamento,
  tokenDoCampoAntigo,
  valoresDoMapeamento,
} from "@/lib/variaveis/mapeamento";
import { tokensUsados } from "@/lib/variaveis/resolver";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const corpoSchema = z
  .object({
    name: z.string().min(1).max(512),
    language: z.string().min(2).max(16),
    conversation_id: z.string().uuid(),
  })
  .strict();

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const orgId = authz.org.orgId;

  const corpo = corpoSchema.safeParse(await req.json().catch(() => null));
  if (!corpo.success) {
    return fail("validation_failed", "esperado { name, language, conversation_id }", 422, { requestId });
  }

  try {
    const admin = createAdminClient();
    const { data: linhas, error } = await admin
      .from("meta_templates")
      .select("name, language, parameter_format, components, contract_hash, variaveis, variaveis_contrato")
      .eq("organization_id", orgId)
      .eq("name", corpo.data.name)
      .eq("language", corpo.data.language)
      .limit(1);
    if (error) throw error;
    const linha = linhas?.[0];
    if (!linha) return fail("not_found", "modelo não encontrado", 404, { requestId });

    const contrato = deriveTemplateContract({
      name: linha.name,
      language: linha.language,
      parameter_format: linha.parameter_format,
      components: linha.components as never,
    });
    const mapa = mapeamentoAtual(linha.contract_hash, linha);
    const slotsSemMapa = slotsDoMapeamento(contrato)
      .map((s) => s.chave)
      .filter((chave) => !mapa[chave]);
    const tokens = [
      ...new Set(
        Object.values(mapa).flatMap((v) => (v.fonte === "campo" ? tokensUsados(tokenDoCampoAntigo(v.campo)) : [])),
      ),
    ];

    const fontes = await fontesDaConversa(
      await createClient(),
      admin,
      orgId,
      corpo.data.conversation_id,
      authz.user.id,
      tokens,
    );
    if (!fontes) return fail("not_found", "conversa não encontrada", 404, { requestId });

    const usaSaudacao = Object.values(mapa).some(
      (v) => v.fonte === "campo" && tokenDoCampoAntigo(v.campo) === TOKEN_DA_SAUDACAO,
    );
    const quando = usaSaudacao ? { agora: new Date(), fuso: fontes.fuso || FUSO_PADRAO } : undefined;
    const r = valoresDoMapeamento(contrato, mapa, fontes, quando);
    return ok({
      valores: r.valores,
      faltando: r.faltando.filter((chave) => !slotsSemMapa.includes(chave)),
      slotsSemMapa,
    });
  } catch (err) {
    return fail("internal_error", err instanceof Error ? err.message : String(err), 500, { requestId });
  }
}
