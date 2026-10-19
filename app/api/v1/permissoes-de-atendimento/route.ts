import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, noContent, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import {
  CHAVES_EDITAVEIS,
  PERMISSOES_DE_CONVERSAS,
  papelAlcanca,
  type ChaveDePermissao,
  type Excecoes,
  type Papel,
} from "@/lib/escale/conversas/permissoes";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const corpoSchema = z.object({
  user_id: z.string().uuid(),
  valores: z.record(z.string(), z.boolean().nullable()),
});

async function lerExcecoes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  userId: string,
): Promise<Excecoes> {
  const { data, error } = await supabase
    .from("crm_permissoes_de_atendimento")
    .select("chave, ligado")
    .eq("organization_id", orgId)
    .eq("user_id", userId);
  if (error) throw error;
  return Object.fromEntries(
    ((data ?? []) as Array<{ chave: ChaveDePermissao; ligado: boolean }>).map((l) => [
      l.chave,
      l.ligado,
    ]),
  );
}

/** A aba Permissões (c92): as exceções da pessoa. Só admin (Usuários e Permissões). */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("admin", { requestId, resource: "team" });
  if (!authz.ok) return authz.response;
  const userId = lerUuid(new URL(req.url).searchParams.get("user_id"));
  if (!userId) return fail("validation_failed", "user_id inválido", 422, { requestId });
  try {
    return ok(
      { excecoes: await lerExcecoes(await createClient(), authz.org.orgId, userId) },
      { requestId },
    );
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}

/** Um toggle ou "Desativar todos": `true/false` grava a exceção; `null` volta ao papel. */
export async function PUT(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("admin", { requestId, resource: "team" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = await lerJson(req);
  const parsed = corpoSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  const { user_id, valores } = parsed.data;
  const supabase = await createClient();
  const { data: membro } = await supabase
    .from("user_organizations")
    .select("role")
    .eq("organization_id", authz.org.orgId)
    .eq("user_id", user_id)
    .is("revoked_at", null)
    .maybeSingle();
  if (!membro) return fail("not_found", t("Usuário não encontrado."), 404, { requestId });
  const papel = (membro as { role: Papel }).role;
  if (papel === "admin")
    return fail("validation_failed", t("Usuário administrador"), 422, { requestId });
  const chaves = Object.keys(valores) as ChaveDePermissao[];
  for (const chave of chaves) {
    const p = PERMISSOES_DE_CONVERSAS.find((x) => x.chave === chave);
    if (!p || !CHAVES_EDITAVEIS.has(chave) || p.modo !== "editavel") {
      return fail("validation_failed", t("Essa permissão é definida pelo papel do usuário."), 422, {
        requestId,
      });
    }
    if (valores[chave] === true && !papelAlcanca(papel, p.piso)) {
      return fail("validation_failed", t("Essa permissão não vale para o papel do usuário."), 422, {
        requestId,
      });
    }
  }
  const agora = new Date().toISOString();
  const gravar = chaves
    .filter((c) => valores[c] !== null)
    .map((chave) => ({
      organization_id: authz.org.orgId,
      user_id,
      chave,
      ligado: valores[chave] as boolean,
      atualizado_por: authz.user.id,
      updated_at: agora,
    }));
  const apagar = chaves.filter((c) => valores[c] === null);
  if (gravar.length > 0) {
    const { error } = await supabase
      .from("crm_permissoes_de_atendimento")
      .upsert(gravar, { onConflict: "organization_id,user_id,chave" });
    if (error) return fail("internal_error", error.message, 500, { requestId });
  }
  if (apagar.length > 0) {
    const { error } = await supabase
      .from("crm_permissoes_de_atendimento")
      .delete()
      .eq("organization_id", authz.org.orgId)
      .eq("user_id", user_id)
      .in("chave", apagar);
    if (error) return fail("internal_error", error.message, 500, { requestId });
  }
  void audit({
    action: "crm_permissoes.updated",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "user",
    resourceId: user_id,
    requestId,
    metadata: { valores },
  });
  return ok({ excecoes: await lerExcecoes(supabase, authz.org.orgId, user_id) }, { requestId });
}

/** O grupo mudou (N6): as exceções saem e vale o papel novo. */
export async function DELETE(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("admin", { requestId, resource: "team" });
  if (!authz.ok) return authz.response;
  const userId = lerUuid(new URL(req.url).searchParams.get("user_id"));
  if (!userId) return fail("validation_failed", "user_id inválido", 422, { requestId });
  const { error } = await (
    await createClient()
  )
    .from("crm_permissoes_de_atendimento")
    .delete()
    .eq("organization_id", authz.org.orgId)
    .eq("user_id", userId);
  if (error) return fail("internal_error", error.message, 500, { requestId });
  void audit({
    action: "crm_permissoes.reset",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "user",
    resourceId: userId,
    requestId,
  });
  return noContent(requestId);
}
