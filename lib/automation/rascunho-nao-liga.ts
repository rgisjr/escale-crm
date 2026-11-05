/**
 * FORK ESCALE · automações: a regra que nasceu de um rascunho e nunca foi publicada não tem ação
 * (o esqueleto, `lib/escale/automacoes/rascunho.ts`). Ligar faria o motor rodar uma regra que não faz
 * nada no lugar da que a pessoa ainda está montando. Pausar nunca é recusado.
 */
export const MENSAGEM_DO_RASCUNHO_NAO_LIGA =
  "Esta automação ainda é um rascunho: corrija os pontos marcados e salve antes de ligar.";

export function semAcaoParaLigar(acoes: unknown): boolean {
  return !Array.isArray(acoes) || acoes.length === 0;
}
