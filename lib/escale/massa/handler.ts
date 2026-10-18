import { patchContactHandler } from "@/app/api/v1/contacts/_handler";
import { createLeadHandler } from "@/app/api/v1/leads/_handler";
import { excluirContatoComNegocios } from "@/lib/escale/contatos/excluir";
import type { EventHandler } from "@/lib/event-log/dispatcher";
import { createAdminClient } from "@/lib/supabase/admin";

import { CONSUMIDOR_DA_ACAO_EM_MASSA, processarAcaoEmMassa } from "./executar";
import { EVENTO_DA_ACAO_EM_MASSA } from "./tipos";

/**
 * Consumidor do `event_log` das ações em massa (fork Escale, Fase 2B). "roda" na
 * organização parada: é escrita interna pedida por alguém da própria organização,
 * sem custo e sem sair para fora (régua de `tests/unit/dispatcher-org-parada.test.ts`).
 */
export const acaoEmMassaHandler: EventHandler = {
  key: CONSUMIDOR_DA_ACAO_EM_MASSA,
  naOrgParada: "roda",
  events: [EVENTO_DA_ACAO_EM_MASSA],
  async handle(row) {
    const db = createAdminClient();
    return processarAcaoEmMassa(row, {
      db,
      agora: () => Date.now(),
      criarNegocio: (ctx, input) =>
        createLeadHandler(db, ctx, input as Parameters<typeof createLeadHandler>[2]),
      mudarContato: (ctx, id, input) => patchContactHandler(db, ctx, id, input),
      // Q5: excluir leva os negócios do contato (todos os da organização).
      excluirContato: (ctx, id) => excluirContatoComNegocios(db, ctx, id),
    });
  },
};
