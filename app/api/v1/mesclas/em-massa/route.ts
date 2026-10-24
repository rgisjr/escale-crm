import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import {
  ErroDaMescla,
  TEXTO_DO_ERRO_DA_MESCLA,
  contatosDaMescla,
  mesclarGrupo,
  type ResultadoDaMescla,
} from "@/lib/escale/mescla/banco";
import { MAX_GRUPOS_EM_MASSA, mesclarEmMassaSchema, principalPorPrioridade } from "@/lib/escale/mescla/regras";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * FORK ESCALE · Fase 2E (C2, Q8): a mescla em massa, na hora, até 100 grupos,
 * um por transação. O principal de cada grupo sai do critério de priorização;
 * sem escolha por campo (como na Clint).
 */
export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "contacts" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const bruto = lido.json as { grupos?: unknown[] } | null;
  if (Array.isArray(bruto?.grupos) && bruto.grupos.length > MAX_GRUPOS_EM_MASSA) {
    return fail("unprocessable_entity", t("Seleção acima do limite"), 422, { requestId });
  }
  const pedido = mesclarEmMassaSchema.safeParse(lido.json);
  if (!pedido.success) {
    return fail("unprocessable_entity", t("São necessários ao menos 2 contatos."), 422, { requestId });
  }
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const orgId = authz.org.orgId;
    const contatos = await contatosDaMescla(supabase, orgId, pedido.data.grupos.flat());
    const mesclados: ResultadoDaMescla[] = [];
    const falhas: Array<{ grupo: string[]; erro: string }> = [];
    for (const grupo of pedido.data.grupos) {
      const membros = grupo.map((id) => contatos.get(id)).filter((c) => c !== undefined);
      if (membros.length < 2) {
        falhas.push({ grupo, erro: t(TEXTO_DO_ERRO_DA_MESCLA.grupo_mudou) });
        continue;
      }
      const principal = principalPorPrioridade(membros, pedido.data.prioridade);
      const secundarios = membros.map((m) => m.id).filter((id) => id !== principal);
      try {
        const feito = await mesclarGrupo(supabase, admin, orgId, authz.user.id, principal, secundarios, {});
        mesclados.push(feito);
        void audit({
          action: "contact.merged",
          actorUserId: authz.user.id,
          organizationId: orgId,
          resourceType: "contact",
          resourceId: principal,
          requestId,
          metadata: { merged_contact_ids: secundarios, em_massa: true, prioridade: pedido.data.prioridade, origem: "casca" },
        });
      } catch (err) {
        const codigo = err instanceof ErroDaMescla ? err.codigo : "falhou";
        falhas.push({ grupo, erro: t(TEXTO_DO_ERRO_DA_MESCLA[codigo]) });
      }
    }
    return ok({ mesclados, falhas }, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "POST /api/v1/mesclas/em-massa", operacao: "mesclar contatos em massa" },
      t,
      requestId,
    );
  }
}
