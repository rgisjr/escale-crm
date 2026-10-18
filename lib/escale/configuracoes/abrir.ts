"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { useT } from "@/hooks/i18n/useT";

/**
 * ABRIR AS CONFIGURAÇÕES DA ORIGEM DE FORA DO PAINEL (fork Escale, Fase 1F, F20).
 *
 * A janela mora no `PainelOrigens` (o ⋮ "Configurações" da origem). A engrenagem
 * da linha de contagem do quadro, que na Clint abre a mesma janela (print 15 da
 * 1E), fica em outro galho da árvore: um evento do navegador liga os dois sem
 * contexto novo no layout. Sem painel montado, ninguém escuta: o painel só
 * entra no quadro se leu as origens, então a engrenagem pergunta (`useHaPainelDeOrigens`)
 * e fica desligada quando ninguém vai abrir a janela.
 */
export const EVENTO_DAS_CONFIGURACOES = "escale:configuracoes-da-origem";
export type AbaDaOrigem = "geral" | "etapas";

export function abrirConfiguracoesDaOrigem(id: string, aba: AbaDaOrigem = "geral"): void {
  window.dispatchEvent(new CustomEvent(EVENTO_DAS_CONFIGURACOES, { detail: { id, aba } }));
}

/** Quantos painéis escutam agora, e quem quer saber quando isso muda. */
let ouvintes = 0;
const interessados = new Set<() => void>();
const avisar = () => interessados.forEach((f) => f());

function assinar(aoMudar: () => void): () => void {
  interessados.add(aoMudar);
  return () => {
    interessados.delete(aoMudar);
  };
}

/**
 * Há algum painel escutando? `useSyncExternalStore` com `false` no servidor e na
 * hidratação: o navegador não é lido em `useState`, a leitura vem da assinatura.
 */
export function useHaPainelDeOrigens(): boolean {
  return useSyncExternalStore(
    assinar,
    () => ouvintes > 0,
    () => false,
  );
}

/**
 * A engrenagem do quadro (F20): liga só com o painel montado e papel de gerente
 * ou acima. Com painel e sem papel, "Sem permissão"; sem painel, "Em breve".
 */
export function useEngrenagemDaOrigem(
  id: string,
  podeConfigurar: boolean,
  aba: AbaDaOrigem = "geral",
): { aoConfigurar: (() => void) | undefined; dicaDaEngrenagem: string } {
  const t = useT();
  const haPainel = useHaPainelDeOrigens();
  return {
    aoConfigurar:
      haPainel && podeConfigurar ? () => abrirConfiguracoesDaOrigem(id, aba) : undefined,
    dicaDaEngrenagem: haPainel ? t("Sem permissão") : t("Em breve"),
  };
}

export function useAoAbrirConfiguracoesDaOrigem(
  aoAbrir: (id: string, aba: AbaDaOrigem) => void,
): void {
  const ultimo = useRef(aoAbrir);
  useEffect(() => {
    ultimo.current = aoAbrir;
  }, [aoAbrir]);
  useEffect(() => {
    const ouvir = (e: Event) => {
      const detalhe = (e as CustomEvent<{ id?: unknown; aba?: unknown }>).detail;
      const id = detalhe?.id;
      if (typeof id === "string" && id.length > 0) {
        ultimo.current(id, detalhe?.aba === "etapas" ? "etapas" : "geral");
      }
    };
    window.addEventListener(EVENTO_DAS_CONFIGURACOES, ouvir);
    ouvintes += 1;
    avisar();
    return () => {
      window.removeEventListener(EVENTO_DAS_CONFIGURACOES, ouvir);
      ouvintes -= 1;
      avisar();
    };
  }, []);
}
