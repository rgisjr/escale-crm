import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import type { Desenho, RegraGravada } from "@/lib/automation/desenho-da-regra";
import { compilar } from "@/lib/escale/automacoes/fluxo/compilar";
import { desenhoSchema } from "@/lib/escale/automacoes/fluxo/desenho-schema";
import { desenhoDoFluxo } from "@/lib/escale/automacoes/fluxo/descompilar";
import { gravarAutomacaoEmModoFluxo, lerAutomacaoEmModoFluxo } from "@/lib/escale/automacoes/fluxo/gravar-modo-fluxo";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// FORK ESCALE · 5D: carregar (GET) e salvar+publicar (PUT) a automação em modo fluxo.
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

const idSchema = z.union([z.literal("novo"), z.string().uuid()]);

const corpoSchema = z.object({
  nome: z.string().max(120),
  desenho: desenhoSchema,
  versao: z.string().min(1).max(64).optional(),
});

/** GET /api/v1/automacoes-da-casca/:id/fluxo — o desenho de uma automação em modo fluxo (404 = modo regra). */
export async function GET(_req: NextRequest, ctx: Contexto): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return fail("not_found", t("Regra não encontrada."), 404, { requestId });
  try {
    const lida = await lerAutomacaoEmModoFluxo(await createClient(), { organizationId: authz.org.orgId, ruleId: id });
    if (!lida) return fail("not_found", t("Regra não encontrada."), 404, { requestId });
    const desenho = desenhoDoFluxo(lida.regra as unknown as RegraGravada, lida.grafo);
    return ok({ desenho }, { requestId });
  } catch (err) {
    console.error("[automacoes-da-casca] ler fluxo", requestId, err);
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}

/** PUT /api/v1/automacoes-da-casca/:id/fluxo — compila no servidor, grava a regra e publica o fluxo. */
export async function PUT(req: NextRequest, ctx: Contexto): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) return fail("not_found", t("Regra não encontrada."), 404, { requestId });
  const lido = corpoSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) return fail("validation_failed", t("Falha na validação dos dados!"), 422, { requestId });

  const db = await createClient();
  const ruleId = id === "novo" ? null : id;
  try {
    // O grafo NUNCA vem do cliente: o servidor compila o desenho de novo.
    let regraGravada: RegraGravada | null = null;
    if (ruleId) {
      const atual = await lerAutomacaoEmModoFluxo(db, { organizationId: authz.org.orgId, ruleId });
      regraGravada = (atual?.regra as unknown as RegraGravada | undefined) ?? null;
    }
    const compilado = compilar({ nome: lido.data.nome.trim(), desenho: lido.data.desenho as unknown as Desenho, regraGravada });
    if (!compilado.ok) {
      return fail("validation_failed", t("Falha na validação dos dados!"), 422, { requestId, details: { problemas: compilado.problemas } });
    }
    if (compilado.modo !== "fluxo") {
      return fail("validation_failed", t("Este desenho se grava como regra, não como fluxo."), 422, { requestId });
    }
    const r = await gravarAutomacaoEmModoFluxo(db, createAdminClient(), {
      organizationId: authz.org.orgId,
      ruleId,
      regra: compilado.regra,
      grafo: compilado.grafo,
      versaoDaRegra: lido.data.versao,
      actor: { type: "user", id: authz.user.id, role: authz.org.role },
      aprovadoPor: authz.user.full_name ?? authz.user.email,
      requestId,
    });
    if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId, details: r.detalhes });
    void audit({
      action: "automation.flow_published",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "automation_rule",
      resourceId: r.dado.ruleId,
      requestId,
      metadata: { pointer_id: r.dado.pointerId },
    });
    return ok(r.dado, { requestId });
  } catch (err) {
    console.error("[automacoes-da-casca] gravar fluxo", requestId, err);
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}
