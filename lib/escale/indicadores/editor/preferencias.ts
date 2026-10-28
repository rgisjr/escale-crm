/** A largura da lateral do editor, guardada no navegador (fork Escale, Fase 7D, S20). Nunca lança. */
export const CHAVE_DA_LARGURA = "escale:indicadores:largura-do-editor";
export const LARGURA_PADRAO = 400;
export const LARGURA_MIN = 240;
export const LARGURA_MAX = 500;

export const recortarLargura = (v: number): number =>
  Number.isFinite(v) ? Math.min(LARGURA_MAX, Math.max(LARGURA_MIN, Math.round(v))) : LARGURA_PADRAO;

type Armazenamento = Pick<Storage, "getItem" | "setItem">;
const doNavegador = (): Armazenamento | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export function lerLargura(armazenamento: Armazenamento | null = doNavegador()): number {
  try {
    const bruto = armazenamento?.getItem(CHAVE_DA_LARGURA);
    return bruto ? recortarLargura(Number(bruto)) : LARGURA_PADRAO;
  } catch {
    return LARGURA_PADRAO;
  }
}

export function gravarLargura(v: number, armazenamento: Armazenamento | null = doNavegador()): void {
  try {
    armazenamento?.setItem(CHAVE_DA_LARGURA, String(recortarLargura(v)));
  } catch {
    // sem armazenamento (janela privada): a tela segue com a largura da sessão
  }
}
