import type { PublicoDaCampanha, SelecaoDoPublico } from "./assistente";

/** O PÚBLICO NA TELA (fork Escale, Fase 8B; N7). Funções puras: o redutor do assistente usa. */
export const publicoVazio = (p: PublicoDaCampanha): boolean =>
  p.selecao === null && p.avulsos.length === 0;

/** Contatos criados na hora ou vindos do .csv: entram sem repetir e deixam de estar removidos. */
export function comAvulsos(p: PublicoDaCampanha, ids: readonly string[]): PublicoDaCampanha {
  const ja = new Set(p.avulsos);
  const novos: string[] = [];
  for (const id of ids) {
    if (ja.has(id)) continue;
    ja.add(id);
    novos.push(id);
  }
  const entram = new Set(ids);
  return {
    ...p,
    avulsos: [...p.avulsos, ...novos],
    removidos: p.removidos.filter((id) => !entram.has(id)),
  };
}

/** "Remover da lista": sai dos avulsos e entra nos removidos (vale também para quem veio pelo filtro). */
export function semContato(p: PublicoDaCampanha, id: string): PublicoDaCampanha {
  return {
    ...p,
    avulsos: p.avulsos.filter((x) => x !== id),
    removidos: p.removidos.includes(id) ? p.removidos : [...p.removidos, id],
  };
}

/** "Selecionar contatos"/"editar seleção" troca a seleção; avulsos e removidos ficam. */
export const comSelecao = (
  p: PublicoDaCampanha,
  s: SelecaoDoPublico | null,
): PublicoDaCampanha => ({ ...p, selecao: s });
