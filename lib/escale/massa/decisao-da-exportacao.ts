import { randomUUID } from "node:crypto";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

/** Os erros de `fn_escale_decidir_exportacao` (9103) → resposta da rota. */
const FALHAS: ReadonlyArray<{ marca: string; status: number; codigo: string; texto: string }> = [
  {
    marca: "acao_em_massa_inexistente",
    status: 404,
    codigo: "not_found",
    texto: "Pedido de exportação não encontrado.",
  },
  {
    marca: "acao_em_massa_sem_permissao",
    status: 403,
    codigo: "forbidden",
    texto: "Só um administrador aprova exportações.",
  },
  {
    marca: "acao_em_massa_propria",
    status: 403,
    codigo: "forbidden",
    texto: "Outro administrador precisa decidir o seu pedido.",
  },
  {
    marca: "acao_em_massa_nao_aguarda",
    status: 409,
    codigo: "state_conflict",
    texto: "Este pedido já foi decidido.",
  },
  {
    marca: "acao_em_massa_expirada",
    status: 422,
    codigo: "unprocessable_entity",
    texto: "O pedido expirou: passou de 7 dias.",
  },
];

/**
 * APROVAR OU RECUSAR UMA EXPORTAÇÃO (fork Escale, Fase 2B; Q4). Admin, com o
 * acompanhamento só-leitura barrado. Quem decide de verdade é o banco
 * (`fn_escale_decidir_exportacao`, invoker): admin da organização, diferente de quem
 * pediu, pedido aguardando e com menos de 7 dias; aprovar põe na fila e emite o
 * evento na mesma transação. As rotas `[id]/aprovar` e `[id]/recusar` só chamam esta.
 */
export async function decidirExportacao(
  ctx: { params: Promise<{ id: string }> },
  aprovar: boolean,
): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("admin", { requestId, resource: "crm_acoes_em_massa" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const rota = `POST /api/v1/acoes-em-massa/[id]/${aprovar ? "aprovar" : "recusar"}`;
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("not_found", t("Pedido de exportação não encontrado."), 404, { requestId });
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("fn_escale_decidir_exportacao", {
      p_acao: id,
      p_aprovar: aprovar,
    });
    if (error) {
      const falha = FALHAS.find((f) => (error.message ?? "").includes(f.marca));
      if (falha) return fail(falha.codigo, t(falha.texto), falha.status, { requestId });
      return falhaInesperadaDoQuadro(
        error,
        { rota, operacao: "decidir a exportação" },
        t,
        requestId,
      );
    }
    const status = String(data);
    void audit({
      action: aprovar ? "contacts.export_approved" : "contacts.export_rejected",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "crm_acoes_em_massa",
      resourceId: id,
      requestId,
      metadata: { status },
    });
    return ok({ id, status }, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota, operacao: "decidir a exportação" },
      t,
      requestId,
    );
  }
}
