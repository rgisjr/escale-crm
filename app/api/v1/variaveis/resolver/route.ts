/**
 * POST /api/v1/variaveis/resolver — o texto com as variáveis da Clint trocadas
 * para o contato de uma conversa (fork Escale, Frente V). Usado pela resposta
 * rápida, que no navegador só conhece o nome do contato.
 *
 * Só leitura (não precisa de `requireSupportWrite`). A conversa passa pela RLS
 * da sessão; fora do alcance, 404. Variável sem valor fica no texto (dialeto
 * "inbox": o compositor barra o envio) e volta em `faltando`.
 */
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fontesDaConversa } from "@/lib/variaveis/fontes-da-conversa";
import { resolverTexto, tokensUsados } from "@/lib/variaveis/resolver";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const corpoSchema = z
  .object({ texto: z.string().max(10_000), conversation_id: z.string().uuid() })
  .strict();

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;

  const corpo = corpoSchema.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return fail("validation_failed", "esperado { texto, conversation_id }", 422, { requestId });

  const tokens = tokensUsados(corpo.data.texto);
  if (tokens.length === 0) return ok({ texto: corpo.data.texto, faltando: [] });

  try {
    const fontes = await fontesDaConversa(
      await createClient(),
      createAdminClient(),
      authz.org.orgId,
      corpo.data.conversation_id,
      authz.user.id,
      tokens,
    );
    if (!fontes) return fail("not_found", "conversa não encontrada", 404, { requestId });
    const r = resolverTexto(corpo.data.texto, fontes, { vazio: "falta" });
    return ok({ texto: r.texto, faltando: r.faltando });
  } catch (err) {
    return fail("internal_error", err instanceof Error ? err.message : String(err), 500, { requestId });
  }
}
