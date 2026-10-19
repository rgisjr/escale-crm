/** Ids por chamada das leituras da fila (as rotas aceitam até 60; a fila carrega 50 por página). */
export const IDS_POR_LOTE = 50;

export function emLotes<T>(itens: readonly T[], tamanho: number = IDS_POR_LOTE): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}

/** Lê cada lote e junta os mapas de resposta num só. */
export async function lerEmLotes<V>(
  ids: readonly string[],
  ler: (lote: string[]) => Promise<Record<string, V>>,
): Promise<Record<string, V>> {
  const partes = await Promise.all(emLotes(ids).map(ler));
  return Object.assign({}, ...partes) as Record<string, V>;
}
