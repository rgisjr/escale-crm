/**
 * PATCH/DELETE /api/v1/filtros-salvos/[id] — mudar e excluir um FILTRO SALVO
 * (fork Escale, Fase 1D). Só quem criou: filtro de outra pessoa (compartilhado
 * ou não) e de outra organização morrem no 404 antes de qualquer escrita, e a
 * RLS (migration 9004) recusa de novo no banco.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { nomeRepetido, validarNomeDoFiltro } from "@/lib/escale/filtros/filtros-salvos";
import { alvoDaLinha, meuFiltro, type LinhaDoMeuFiltro } from "@/lib/escale/filtros/ler-filtros-salvos";
import {
  falhaDaGravacaoDoFiltro,
  filtrosSalvosOuFalha,
  responderComFiltrosSalvos,
} from "@/lib/escale/filtros/respostas";
import { filtrosDoQuadroSchema } from "@/lib/escale/filtros/tipos";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const corpoSchema = z
  .object({
    nome: z.string().max(200).optional(),
    compartilhado: z.boolean().optional(),
    criterios: filtrosDoQuadroSchema.optional(),
  })
  .strict()
  .refine((b) => Object.keys(b).length > 0);

const ehUuid = (id: string) => z.string().uuid().safeParse(id).success;

/** O filtro do id SE for de quem chama; senão, a resposta (404 ou 500). */
async function acharMeuFiltro(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  userId: string,
  id: string,
  t: (texto: string) => string,
  requestId: string,
): Promise<{ ok: true; linha: LinhaDoMeuFiltro } | { ok: false; resposta: Response }> {
  const naoAchou = { ok: false as const, resposta: fail("not_found", t("Filtro não encontrado."), 404, { requestId }) };
  if (!ehUuid(id)) return naoAchou;
  try {
    const linha = await meuFiltro(supabase, orgId, userId, id);
    return linha ? { ok: true, linha } : naoAchou;
  } catch (err) {
    return { ok: false, resposta: fail("internal_error", (err as Error).message, 500, { requestId }) };
  }
}

export async function PATCH(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_filtros_salvos" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const userId = authz.user.id;
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
  const achado = await acharMeuFiltro(supabase, orgId, userId, id, t, requestId);
  if (!achado.ok) return achado.resposta;
  const alvo = alvoDaLinha(achado.linha);

  const patch: Record<string, unknown> = {};
  if (parsed.data.nome !== undefined) {
    const nome = validarNomeDoFiltro(parsed.data.nome);
    if (!nome.ok) return fail("unprocessable_entity", t(nome.erro), 422, { requestId });
    const atuais = await filtrosSalvosOuFalha(supabase, orgId, userId, alvo, requestId);
    if (!atuais.ok) return atuais.resposta;
    if (nomeRepetido(nome.nome, atuais.filtros.filter((f) => f.meu), id)) {
      return fail("state_conflict", t("Você já tem um filtro com esse nome aqui."), 409, { requestId });
    }
    patch.nome = nome.nome;
  }
  if (parsed.data.compartilhado !== undefined) patch.compartilhado = parsed.data.compartilhado;
  if (parsed.data.criterios !== undefined) patch.criterios = parsed.data.criterios;

  const { error } = await supabase
    .from("crm_filtros_salvos")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", orgId)
    .eq("user_id", userId);
  if (error) return falhaDaGravacaoDoFiltro(error, t, requestId);

  void audit({
    action: "pipeline_filter.updated",
    actorUserId: userId,
    organizationId: orgId,
    resourceType: "crm_filtro_salvo",
    resourceId: id,
    requestId,
    metadata: { campos: Object.keys(patch) },
  });

  return responderComFiltrosSalvos(supabase, orgId, userId, alvo, requestId);
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_filtros_salvos" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const userId = authz.user.id;
  const { id } = await ctx.params;

  const supabase = await createClient();
  const achado = await acharMeuFiltro(supabase, orgId, userId, id, t, requestId);
  if (!achado.ok) return achado.resposta;

  const { error } = await supabase
    .from("crm_filtros_salvos")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId)
    .eq("user_id", userId);
  if (error) return falhaDaGravacaoDoFiltro(error, t, requestId);

  void audit({
    action: "pipeline_filter.deleted",
    actorUserId: userId,
    organizationId: orgId,
    resourceType: "crm_filtro_salvo",
    resourceId: id,
    requestId,
    metadata: { nome: achado.linha.nome },
  });

  return responderComFiltrosSalvos(supabase, orgId, userId, alvoDaLinha(achado.linha), requestId);
}
