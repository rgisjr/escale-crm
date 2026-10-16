/**
 * O "SELECIONE N" DO ⋮ DA ETAPA (fork Escale, Fase 1E; Clint superior,
 * `input-stage-deal-qty`): os N primeiros da etapa, na ordem da tela, no lugar
 * do que estava marcado NESTA etapa. As outras etapas não mudam. Numa conta só,
 * para o pai receber um conjunto pronto (o `onSelectionChange` não acumula).
 */
export function selecaoDaEtapa(
  idsDaEtapa: readonly string[],
  selecionados: ReadonlySet<string>,
  n: number,
): Set<string> {
  const daEtapa = new Set(idsDaEtapa);
  const proximo = new Set([...selecionados].filter((id) => !daEtapa.has(id)));
  const quantos = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : n > 0 ? idsDaEtapa.length : 0;
  for (const id of idsDaEtapa.slice(0, quantos)) proximo.add(id);
  return proximo;
}

/**
 * O texto do campo "Selecione [N]" como inteiro dentro da etapa: decimal vira o
 * inteiro de baixo; vazio, inválido ou negativo vira 0; acima do total vira o total.
 */
export function quantidadeDigitada(texto: string, total: number): number {
  const numero = texto.trim() === "" ? 0 : Number(texto);
  if (Number.isNaN(numero)) return 0;
  const inteiro = Number.isFinite(numero) ? Math.floor(numero) : numero > 0 ? total : 0;
  return Math.min(Math.max(0, inteiro), Math.max(0, total));
}
