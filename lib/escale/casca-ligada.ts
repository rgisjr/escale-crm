import { useEffect, useSyncExternalStore } from "react";

/**
 * A CASCA NOVA ESTÁ LIGADA? (fork Escale · avisos iguais aos da Clint)
 *
 * O marcador da casca (`data-escale-casca`) mora no `<div>` do AppShell, e quem
 * precisa dele aqui (o Toaster e o `entregarAviso`) fica fora do AppShell: o
 * Toaster é do layout raiz. Por isso o AppShell também marca o `<html>`, e a
 * pergunta vira um atributo só, barato de observar: sem `subtree`, sem varrer o
 * documento a cada mutação do chat.
 */
export const ATRIBUTO_DA_CASCA = "data-escale-casca-ligada";

export function cascaLigada(): boolean {
  return typeof document !== "undefined" && document.documentElement.hasAttribute(ATRIBUTO_DA_CASCA);
}

/** Chamado pelo AppShell: marca o `<html>` enquanto o menu do topo estiver em uso. */
export function useMarcarCascaNoDocumento(ligada: boolean): void {
  useEffect(() => {
    if (!ligada) return;
    const raiz = document.documentElement;
    raiz.setAttribute(ATRIBUTO_DA_CASCA, "");
    return () => raiz.removeAttribute(ATRIBUTO_DA_CASCA);
  }, [ligada]);
}

function assinar(avisar: () => void): () => void {
  const observador = new MutationObserver(avisar);
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [ATRIBUTO_DA_CASCA],
  });
  return () => observador.disconnect();
}

export function useCascaLigada(): boolean {
  return useSyncExternalStore(assinar, cascaLigada, () => false);
}
