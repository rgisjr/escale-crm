/**
 * MODO ESPIÃO (fork Escale, Fase 3A; A9): uma marca da sessão do navegador,
 * sem banco (seção 7 do PRD). Ligado, abrir uma conversa não a marca como
 * lida. A 3E reaproveita a mesma chave na aba Conversas da ficha.
 */
export const CHAVE_DO_MODO_ESPIAO = "escale_modo_espiao";

interface StorageLeve {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export function lerModoEspiao(storage: StorageLeve | null | undefined): boolean {
  try {
    return storage?.getItem(CHAVE_DO_MODO_ESPIAO) === "1";
  } catch {
    return false;
  }
}

export function gravarModoEspiao(storage: StorageLeve | null | undefined, ligado: boolean): void {
  try {
    if (ligado) storage?.setItem(CHAVE_DO_MODO_ESPIAO, "1");
    else storage?.removeItem(CHAVE_DO_MODO_ESPIAO);
  } catch {
    // Sem acesso ao sessionStorage (modo privado, SecurityError): a marca não persiste.
  }
}
