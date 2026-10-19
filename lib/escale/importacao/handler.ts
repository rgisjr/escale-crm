import type { SupabaseClient } from "@supabase/supabase-js";

import { patchContactHandler } from "@/app/api/v1/contacts/_handler";
import { createLeadHandler, updateLeadHandler } from "@/app/api/v1/leads/_handler";
import { camposCpfParaGravar } from "@/lib/contacts/cpf";
import type { EventHandler } from "@/lib/event-log/dispatcher";
import { encerraDemanda } from "@/lib/leads/encerramento";
import { createAdminClient } from "@/lib/supabase/admin";

import type { Membro } from "./contexto";
import { CONSUMIDOR_DA_IMPORTACAO, EVENTO_DA_IMPORTACAO, processarImportacao, type Dependencias } from "./executar";

/** Os membros ativos (atendente ou acima), com o e-mail e o nome da conta, para achar o dono pelo texto da planilha. */
async function lerMembros(db: SupabaseClient, orgId: string): Promise<Membro[]> {
  const { data, error } = await db
    .from("user_organizations")
    .select("user_id, role")
    .eq("organization_id", orgId)
    .is("revoked_at", null)
    .neq("role", "viewer");
  if (error) throw new Error(error.message);
  return Promise.all(
    ((data ?? []) as Array<{ user_id: string }>).map(async (m) => {
      const { data: conta } = await db.auth.admin.getUserById(m.user_id);
      return {
        userId: m.user_id,
        email: conta?.user?.email ?? null,
        nome: (conta?.user?.user_metadata?.full_name as string | undefined) ?? null,
      };
    }),
  );
}

export function dependenciasReais(db: SupabaseClient): Dependencias {
  return {
    db,
    agora: () => Date.now(),
    lerMembros: (orgId) => lerMembros(db, orgId),
    mudarContato: (ctx, id, patch) => patchContactHandler(db, ctx, id, patch as Parameters<typeof patchContactHandler>[3]),
    criarNegocio: (ctx, input) =>
      createLeadHandler(db, ctx, input as Parameters<typeof createLeadHandler>[2], { exigirCamposDaEtapa: false }),
    mudarNegocio: (ctx, id, input) => updateLeadHandler(db, ctx, id, input as Parameters<typeof updateLeadHandler>[3]),
    encerrar: (ctx, input) => encerraDemanda(db, ctx, input),
    cpf: (cpf) => camposCpfParaGravar(db, cpf),
  };
}

/**
 * Consumidor do `event_log` das importações (fork Escale, Fase 2F). "roda" na
 * organização parada: é escrita interna pedida por alguém da própria organização,
 * sem custo e sem sair para fora (régua de `tests/unit/dispatcher-org-parada.test.ts`).
 */
export const importacaoHandler: EventHandler = {
  key: CONSUMIDOR_DA_IMPORTACAO,
  naOrgParada: "roda",
  events: [EVENTO_DA_IMPORTACAO],
  async handle(row) {
    return processarImportacao(row, dependenciasReais(createAdminClient()));
  },
};
