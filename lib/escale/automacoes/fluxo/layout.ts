import { percorrer, type Desenho } from "@/lib/automation/desenho-da-regra";

/**
 * FORK ESCALE · Fase 5B: a arrumação do fluxo da casca, da esquerda para a
 * direita (07-013, 07-026). O `organizar` do motor é vertical e é o do
 * original; este fica só na casca. A posição continua não gravada.
 */

/** 07-013: o nó da Clint mede ~352 px de largura a zoom 1. */
export const LARGURA_DO_NO = 352;
export const ESPACO_ENTRE_NOS = 120;
export const ALTURA_ESTIMADA_DO_NO = 180;
const ESPACO_ATE_AS_SOLTAS = 160;

/**
 * A fila da esquerda para a direita, na ordem em que roda. O que está fora da
 * fila vai para uma linha embaixo, para ninguém confundir com a ordem.
 * `alturas` vem do DOM quando o canvas já mediu; sem ela, a estimativa.
 */
export function organizarNaHorizontal(desenho: Desenho, alturas?: ReadonlyMap<string, number>): Desenho {
  const { fila } = percorrer(desenho);
  const altura = (id: string) => alturas?.get(id) ?? ALTURA_ESTIMADA_DO_NO;
  const passo = LARGURA_DO_NO + ESPACO_ENTRE_NOS;
  const posicoes = new Map<string, { x: number; y: number }>(fila.map((c, i) => [c.id, { x: i * passo, y: 0 }]));
  const ySoltas = Math.max(0, ...fila.map((c) => altura(c.id))) + ESPACO_ATE_AS_SOLTAS;
  let x = 0;
  for (const c of desenho.caixas) {
    if (posicoes.has(c.id)) continue;
    posicoes.set(c.id, { x, y: ySoltas });
    x += passo;
  }
  return {
    caixas: desenho.caixas.map((c) => ({ ...c, position: posicoes.get(c.id) ?? c.position })),
    ligacoes: desenho.ligacoes,
  };
}
