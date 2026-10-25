import { retomaEnrollment } from "@/lib/followup/intervencao";
import { logger } from "@/lib/logger";

type DepsDaRetomada = Parameters<typeof retomaEnrollment>[0];

/**
 * Retoma os follow-ups de uma pausa e devolve os que AINDA precisam de nova
 * tentativa. "Não encontrado" e "estado incompatível" (já voltou a andar, foi
 * encerrado) não há o que retomar: contam como resolvidos. Qualquer outra falha
 * fica na lista, e quem chamou só pode apagar a pausa quando a lista vier vazia
 * (a linha da pausa é o único registro de quais follow-ups retomar).
 */
export async function retomarEnrollmentsDaPausa(
  deps: DepsDaRetomada,
  ids: readonly string[],
  contexto: { origem: string; conversationId: string },
): Promise<string[]> {
  const pendentes: string[] = [];
  for (const id of ids) {
    const r = await retomaEnrollment(deps, id);
    if (r.ok || r.codigo === "nao_encontrado" || r.codigo === "estado_incompativel") continue;
    pendentes.push(id);
    logger.warn(`${contexto.origem}: follow-up não retomado`, {
      enrollment: id,
      conversation_id: contexto.conversationId,
      codigo: r.codigo,
    });
  }
  return pendentes;
}
