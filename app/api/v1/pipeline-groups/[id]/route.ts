/**
 * PATCH/DELETE /api/v1/pipeline-groups/[id] — mudar e excluir um GRUPO DE
 * FUNIS (fork Escale, Fases 1A e 1B).
 *
 * PATCH é parcial: nome, cor (tom da paleta ou `null` = automática), ícone e
 * arquivado. Arquivar NÃO arquiva cada funil: o grupo some do painel com as
 * origens, que continuam recebendo negócio.
 *
 * DELETE: toda origem tem grupo (migration 9002), e a FK recusa excluir grupo
 * com funil. Grupo com origens exige `?destino=<grupo ativo>`: a rota move
 * TODAS (inclusive as arquivadas) e só depois exclui. Grupo de outra
 * organização morre no 404 antes de qualquer escrita.
 *
 * Fase 1J (Q6): `pessoas` grava a lista de quem vê o grupo em `settings` dele
 * (o mesmo desenho da origem); só membros ativos da organização entram.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { listaParaGravar, membrosAtivos } from "@/lib/escale/acesso/membros";
import { CHAVE_DAS_PESSOAS, PESSOAS_MAX } from "@/lib/escale/acesso/regras";
import { ICONES_DE_GRUPO, corValida, validarNomeDeGrupo } from "@/lib/escale/origens/regras";
import { lerJson, nomeRepetido, origensOuFalha, responderComOrigens } from "@/lib/escale/origens/respostas";
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
    color: z.string().max(7).nullable().optional(),
    icon: z.enum(ICONES_DE_GRUPO).optional(),
    is_archived: z.boolean().optional(),
    pessoas: z.array(z.string().uuid()).max(PESSOAS_MAX).optional(),
  })
  .strict()
  .refine((b) => Object.keys(b).length > 0);

const destinoSchema = z.string().uuid();

export async function PATCH(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipeline_groups" });
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
  const pedido = parsed.data;

  const supabase = await createClient();
  const antes = await origensOuFalha(supabase, orgId, requestId);
  if (!antes.ok) return antes.resposta;

  const grupo = antes.origens.grupos.find((g) => g.id === id);
  if (!grupo) return fail("not_found", t("Grupo não encontrado."), 404, { requestId });

  const patch: Record<string, unknown> = {};
  if (pedido.name !== undefined) {
    const veredito = validarNomeDeGrupo(pedido.name, antes.origens.grupos, id);
    if (!veredito.ok) return fail("unprocessable_entity", t(veredito.erro), 422, { requestId });
    patch.name = veredito.nome;
  }
  if (pedido.color !== undefined) {
    if (pedido.color !== null && corValida(pedido.color) === null) {
      return fail("unprocessable_entity", t("Escolha uma cor da paleta."), 422, { requestId });
    }
    patch.color = pedido.color;
  }
  if (pedido.icon !== undefined) patch.icon = pedido.icon;
  if (pedido.is_archived !== undefined && pedido.is_archived !== grupo.is_archived) {
    const outrosAtivos = antes.origens.grupos.filter((g) => g.id !== id && !g.is_archived);
    if (pedido.is_archived && outrosAtivos.length === 0) {
      return fail(
        "unprocessable_entity",
        t("Este é o único grupo ativo. Crie outro grupo antes de arquivar este."),
        422,
        { requestId },
      );
    }
    patch.is_archived = pedido.is_archived;
  }
  // 1J (Q6): a lista de quem vê o grupo, no settings dele (o mesmo desenho da origem).
  if (pedido.pessoas !== undefined) {
    const lidos = await membrosAtivos(supabase, orgId);
    if (!lidos.ok) return fail("internal_error", lidos.causa.message, 500, { requestId });
    const lista = listaParaGravar(pedido.pessoas, lidos.ids);
    if (!lista.ok) return fail("unprocessable_entity", t(lista.erro), 422, { requestId });
    const atual = await supabase
      .from("crm_pipeline_groups")
      .select("settings")
      .eq("id", id)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (atual.error) return fail("internal_error", atual.error.message, 500, { requestId });
    const settings = { ...((atual.data as { settings?: Record<string, unknown> } | null)?.settings ?? {}) };
    if (lista.lista) settings[CHAVE_DAS_PESSOAS] = lista.lista;
    else delete settings[CHAVE_DAS_PESSOAS];
    patch.settings = settings;
  }
  // Nada a mudar (ex.: arquivar o que já está arquivado): sem escrita e sem auditoria.
  if (Object.keys(patch).length === 0) return ok(antes.origens, { requestId });

  const { error } = await supabase
    .from("crm_pipeline_groups")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) return nomeRepetido(error, t, requestId) ?? fail("internal_error", error.message, 500, { requestId });

  void audit({
    action:
      patch.is_archived === true
        ? "pipeline_group.archived"
        : patch.is_archived === false
          ? "pipeline_group.unarchived"
          : "pipeline_group.updated",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline_group",
    resourceId: id,
    requestId,
    metadata: {
      antes: {
        name: grupo.name,
        color: grupo.color,
        icon: grupo.icon,
        is_archived: grupo.is_archived,
        pessoas: grupo.pessoas ?? [],
      },
      mudou: patch,
    },
  });

  return responderComOrigens(supabase, orgId, requestId);
}

export async function DELETE(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipeline_groups" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;

  const supabase = await createClient();
  const antes = await origensOuFalha(supabase, orgId, requestId);
  if (!antes.ok) return antes.resposta;

  const grupo = antes.origens.grupos.find((g) => g.id === id);
  if (!grupo) return fail("not_found", t("Grupo não encontrado."), 404, { requestId });

  const doGrupo = antes.origens.funis.filter((f) => f.group_id === id);
  let destino: string | null = null;
  if (doGrupo.length > 0) {
    const pedido = destinoSchema.safeParse(req.nextUrl.searchParams.get("destino"));
    const alvo = pedido.success
      ? antes.origens.grupos.find((g) => g.id === pedido.data && g.id !== id && !g.is_archived)
      : undefined;
    if (!alvo) {
      return fail("unprocessable_entity", t("Escolha para qual grupo as origens deste grupo vão."), 422, { requestId });
    }
    destino = alvo.id;
    // Duas escritas sem transação, nesta ordem de propósito: se a exclusão
    // falhar, sobra um grupo vazio — nunca uma origem sem grupo.
    const { error: moverErr } = await supabase
      .from("crm_pipelines")
      .update({ group_id: destino })
      .eq("organization_id", orgId)
      .eq("group_id", id);
    if (moverErr) return fail("internal_error", moverErr.message, 500, { requestId });
  }

  const { error } = await supabase
    .from("crm_pipeline_groups")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) return fail("internal_error", error.message, 500, { requestId });

  void audit({
    action: "pipeline_group.deleted",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline_group",
    resourceId: id,
    requestId,
    metadata: { name: grupo.name, funis: doGrupo.length, destino },
  });

  return responderComOrigens(supabase, orgId, requestId);
}
