"use client";
import { useCallback, useSyncExternalStore } from "react";

import { gravarModoEspiao, lerModoEspiao } from "@/lib/escale/conversas/modo-espiao";

const EVENTO = "escale:modo-espiao";

function assinar(aoMudar: () => void): () => void {
  window.addEventListener(EVENTO, aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => {
    window.removeEventListener(EVENTO, aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

function sessao(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** MODO ESPIÃO (A9): a marca da sessão, compartilhada por quem estiver montado. */
export function useModoEspiao(): [boolean, (ligado: boolean) => void] {
  const ligado = useSyncExternalStore(
    assinar,
    () => lerModoEspiao(sessao()),
    () => false,
  );
  const mudar = useCallback((v: boolean) => {
    gravarModoEspiao(sessao(), v);
    window.dispatchEvent(new CustomEvent(EVENTO));
  }, []);
  return [ligado, mudar];
}
