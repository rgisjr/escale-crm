import type { CartaoDeNumero } from "@/lib/escale/automacoes/insights/tipos";

/** O que `fn_escale_resumo_dos_comentarios` (9801) devolve para uma regra no período. */
export interface ResumoDosComentarios {
  comentarios: number;
  repetidos: number;
  directs: number;
  directs_com_falha: number;
  respostas: number;
  respostas_com_falha: number;
}

/**
 * FORK ESCALE · Fase 10B (D15): os quatro números a mais no nó do gatilho de comentário. Sem clique
 * (`filtro: null`): a listagem é de execuções, e o comentário repetido não tem execução.
 */
export function cartoesDoGatilhoDeComentario(resumo: ResumoDosComentarios): CartaoDeNumero[] {
  return [
    { chave: "comentarios", rotulo: "Comentários", valor: resumo.comentarios, filtro: null },
    {
      chave: "repetidos",
      rotulo: "Repetidos",
      valor: resumo.repetidos,
      filtro: null,
      dica: "Pessoas que já tinham recebido esta automação: o fluxo não rodou de novo.",
    },
    { chave: "respostas", rotulo: "Respostas públicas", valor: resumo.respostas, filtro: null },
    { chave: "respostas_com_falha", rotulo: "Respostas com falha", valor: resumo.respostas_com_falha, filtro: null },
  ];
}
