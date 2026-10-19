import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { roleAtLeast } from "@/lib/auth/types";
import { gravarExtras, lerRespostas } from "@/lib/escale/conversas/respostas-banco";
import { FILTRO_PESSOAIS, FILTRO_TODOS, respostaSchema } from "@/lib/escale/conversas/respostas";
import { pode } from "@/lib/escale/conversas/setores-banco";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const listaSchema = z.object({
  busca: z.string().trim().max(100).optional(),
  setor: z.string().max(40).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  por_pagina: z.coerce.number().int().min(1).max(50).default(10),
});

/** A tabela de Respostas rápidas (c41): busca no atalho e no conteúdo, filtro Setor, paginação. */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "message_templates" });
  if (!authz.ok) return authz.response;
  const url = new URL(req.url);
  const parsed = listaSchema.safeParse({
    busca: url.searchParams.get("busca") ?? undefined,
    setor: url.searchParams.get("setor") ?? undefined,
    pagina: url.searchParams.get("pagina") ?? undefined,
    por_pagina: url.searchParams.get("por_pagina") ?? undefined,
  });
  if (!parsed.success) return fail("validation_failed", "Filtro inválido.", 422, { requestId });
  const f = parsed.data;
  try {
    const todas = await lerRespostas(await createClient(), authz.org.orgId);
    const termo = f.busca?.toLocaleLowerCase("pt-BR") ?? "";
    const filtradas = todas.filter((r) => {
      if (
        termo &&
        !r.atalho.toLocaleLowerCase("pt-BR").includes(termo) &&
        !r.corpo.toLocaleLowerCase("pt-BR").includes(termo)
      )
        return false;
      if (!f.setor || f.setor === FILTRO_TODOS) return true;
      if (f.setor === FILTRO_PESSOAIS) return r.dono === authz.user.id;
      return r.todos_os_setores || r.setores.includes(f.setor);
    });
    const inicio = (f.pagina - 1) * f.por_pagina;
    return ok(filtradas.slice(inicio, inicio + f.por_pagina), {
      requestId,
      meta: { total: filtradas.length, pagina: f.pagina, por_pagina: f.por_pagina },
    });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}

/** "Salvar" de "Criar Resposta rápida" (c96). */
export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("agent", { requestId, resource: "message_templates" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = await lerJson(req);
  const parsed = respostaSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  const r = parsed.data;
  const sessao = await createClient();
  // Compartilhar é do gerente no original; com a exceção da Clint, o fork grava pelo service role.
  let db = sessao;
  if (r.compartilhar && !roleAtLeast(authz.org.role, "manager")) {
    if (!(await pode(sessao, authz.org.orgId, "CHAT_SHARE_QUICK_RESPONSE"))) {
      return fail("forbidden", t("Você não pode compartilhar respostas rápidas."), 403, {
        requestId,
      });
    }
    db = createAdminClient();
  }
  const { data, error } = await db
    .from("message_templates")
    .insert({
      organization_id: authz.org.orgId,
      owner_user_id: r.compartilhar ? null : authz.user.id,
      title: r.atalho,
      shortcut: r.atalho,
      body: r.corpo,
      created_by_user_id: authz.user.id,
    })
    .select("id")
    .single();
  if (error)
    return fail(
      error.code === "42501" ? "forbidden" : "internal_error",
      error.message,
      error.code === "42501" ? 403 : 500,
      { requestId },
    );
  const id = (data as { id: string }).id;
  try {
    await gravarExtras(db, authz.org.orgId, id, r);
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
  void audit({
    action: "quick_reply.created",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "message_template",
    resourceId: id,
    requestId,
    metadata: { compartilhada: r.compartilhar, canais: r.canais },
  });
  return ok({ id }, { requestId, status: 201 });
}
