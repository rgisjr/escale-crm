import type { Edge } from "@xyflow/react";

import type { NoDaAutomacao } from "@/app/app/webhooks/automacoes/[id]/_components/CaixaDaAutomacao";
import type { Desenho } from "@/lib/automation/desenho-da-regra";

/** Do desenho para os nós e as ligações do React Flow (o editor da 5B e os Insights da 5C usam o mesmo). */
export function paraNos(desenho: Desenho): NoDaAutomacao[] {
  return desenho.caixas.map((c) => ({ id: c.id, type: c.type, position: c.position, data: c.data }));
}

export function paraLigacoes(desenho: Desenho): Edge[] {
  return desenho.ligacoes.map((l) => ({ id: l.id, source: l.source, target: l.target }));
}
