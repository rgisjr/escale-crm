import { TelaMensagensAgendadas } from "@/components/escale/conversas/agendadas/TelaMensagensAgendadas";

import { paginaDaConfiguracao } from "../_casca";

export const dynamic = "force-dynamic";

/**
 * FORK ESCALE · Fase 3B (C9, N19) / 3C (N9): "Configurações › Mensagens agendadas"
 * da Clint, dentro da casca de Conversas. Sem a casca, volta para o inbox do original.
 */
export default async function MensagensAgendadasPage() {
  return paginaDaConfiguracao(<TelaMensagensAgendadas />);
}
