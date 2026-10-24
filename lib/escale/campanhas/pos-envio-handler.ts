import { patchContactHandler } from "@/app/api/v1/contacts/_handler";
import { createLeadHandler } from "@/app/api/v1/leads/_handler";
import type { EventHandler } from "@/lib/event-log/dispatcher";
import { createAdminClient } from "@/lib/supabase/admin";

import { CONSUMIDOR_DO_POS_ENVIO, EVENTO_DO_POS_ENVIO, processarPosEnvio } from "./pos-envio";

/**
 * Consumidor do `event_log` do pós-envio da campanha (fork Escale, Fase 8B).
 * "roda" na organização parada, como as ações em massa da 2B: escrita interna
 * pedida pela própria organização, sem custo e sem sair para fora.
 */
export const posEnvioHandler: EventHandler = {
  key: CONSUMIDOR_DO_POS_ENVIO,
  naOrgParada: "roda",
  events: [EVENTO_DO_POS_ENVIO],
  async handle(row) {
    const db = createAdminClient();
    return processarPosEnvio(row, {
      db,
      agora: () => Date.now(),
      mudarContato: (ctx, id, input) => patchContactHandler(db, ctx, id, input),
      criarNegocio: (ctx, input) =>
        createLeadHandler(db, ctx, input as Parameters<typeof createLeadHandler>[2]),
    });
  },
};
