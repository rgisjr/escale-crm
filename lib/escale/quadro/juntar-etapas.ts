import type { Lead } from "@/lib/types/leads";

/**
 * JUNTA AS ETAPAS DE ENRIQUECIMENTO DO QUADRO (Q2b, G2-3).
 *
 * Cada etapa da rota do quadro recebe os MESMOS negócios e devolve cada um com o
 * próprio campo a mais (`owner_agent`, `next_action`, `score`, `tarefas`, ...).
 * Como nenhuma lê o que a outra escreve, elas correm juntas e este passo soma o
 * que cada uma acrescentou, casando pelo `id`: só entram as chaves que a etapa
 * MUDOU em relação ao negócio de partida (por referência), então uma etapa que
 * devolve o negócio intacto não apaga o campo de outra.
 */
export function juntarEtapasPorLead(base: readonly Lead[], etapas: ReadonlyArray<readonly Lead[]>): Lead[] {
  const porEtapa = etapas.map((leads) => new Map(leads.map((l) => [l.id, l])));
  return base.map((original) => {
    const origem = original as unknown as Record<string, unknown>;
    let junto: Record<string, unknown> | null = null;
    for (const etapa of porEtapa) {
      const dela = etapa.get(original.id) as unknown as Record<string, unknown> | undefined;
      if (!dela || dela === origem) continue;
      for (const chave of Object.keys(dela)) {
        if (dela[chave] === origem[chave]) continue;
        junto ??= { ...origem };
        junto[chave] = dela[chave];
      }
    }
    return (junto ?? original) as unknown as Lead;
  });
}
