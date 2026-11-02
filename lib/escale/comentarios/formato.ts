import { dataHoraBr } from "@/lib/escale/negocio/arquivos";

import { PRAZO_DA_RESPOSTA_PRIVADA_MS, type PlataformaDeComentario } from "./constantes";

/** FORK ESCALE · Fase 10A: textos de formato da caixa (data BR sem segundos, nome da rede). */
const SEM_SEGUNDOS = 16;

/** dd/mm/aaaa HH:mm; data ilegível vira "". */
export const quandoBr = (iso: string | null | undefined): string =>
  iso && !Number.isNaN(Date.parse(iso)) ? dataHoraBr(iso).slice(0, SEM_SEGUNDOS) : "";

export const NOME_DA_REDE: Record<PlataformaDeComentario, string> = { instagram: "Instagram", facebook: "Facebook" };

/** Até quando o comentário aceita direct (comentário + 7 dias), em dd/mm/aaaa HH:mm; data ilegível vira "". */
export const limiteDoDirect = (comentadoEm: string): string => {
  const quando = Date.parse(comentadoEm);
  return Number.isNaN(quando) ? "" : quandoBr(new Date(quando + PRAZO_DA_RESPOSTA_PRIVADA_MS).toISOString());
};
