/**
 * DELETE /api/v1/lista-de-contatos/[id] — o "Excluir" do ⋮ da linha da casca (fork
 * Escale, Fase 2B; Q5): exclui o contato COM os negócios dele, pela mesma regra da
 * exclusão em massa (`excluirContatoComNegocios`: trava da Agenda, negócios pelo
 * caminho do lote do original, `deleteContactHandler`), com a sessão de quem pede.
 * Gerente ou acima, como o ⋮ da casca já mostra (2A). O `DELETE /api/v1/contacts/[id]`
 * do original não muda.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError } from "@/lib/api/types";
import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { excluirContatoComNegocios } from "@/lib/escale/contatos/excluir";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "contacts" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail(
      "unprocessable_entity",
      t("Não consegui completar essa ação. Tente de novo."),
      422,
      { requestId },
    );
  }
  try {
    const feito = await excluirContatoComNegocios(
      await createClient(),
      {
        organization_id: authz.org.orgId,
        actor: { type: "user", id: authz.user.id },
        requestId,
        idioma: authz.user.idioma,
      },
      id,
    );
    return ok(feito, { requestId });
  } catch (err) {
    if (err instanceof ApiError) {
      // `details` leva os vínculos que barraram (a Agenda), como o DELETE do original.
      return fail(err.code, err.message, err.status, {
        details: err.details as Record<string, unknown> | undefined,
        requestId,
      });
    }
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "DELETE /api/v1/lista-de-contatos/[id]", operacao: "excluir o contato" },
      t,
      requestId,
    );
  }
}
