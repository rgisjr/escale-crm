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
  for (const id of idsDaEtapa.slice(0, Math.max(0, Math.floor(n)))) proximo.add(id);
  return proximo;
}
