import { patchContactHandler } from "@/app/api/v1/contacts/_handler";
import type { EventHandler } from "@/lib/event-log/dispatcher";
import { createAdminClient } from "@/lib/supabase/admin";

import { EVENTO_DA_MASSA_DA_FILA } from "../acoes-em-massa-da-fila";
import { transferirConversaParaSetor } from "../setores-banco";

import {
  CONSUMIDOR_DA_MASSA_DA_FILA,
  processarAcaoDaFila,
  type DependenciasDaMassa,
} from "./executar";

/** As dependências reais (service role) — também usadas pela rota no caminho imediato (N15). */
export function dependenciasReais(): DependenciasDaMassa {
  const db = createAdminClient();
  return {
    db,
    agora: () => Date.now(),
    mudarContato: (ctx, id, input) => patchContactHandler(db, ctx, id, input),
    transferirSetor: transferirConversaParaSetor,
  };
}

/** Consumidor do `event_log` das ações em massa da fila (fork Escale, Fase 3D). Escrita interna pedida pela própria organização. */
export const acaoEmMassaDaFilaHandler: EventHandler = {
  key: CONSUMIDOR_DA_MASSA_DA_FILA,
  naOrgParada: "roda",
  events: [EVENTO_DA_MASSA_DA_FILA],
  async handle(row) {
    return processarAcaoDaFila(row, dependenciasReais());
  },
};
