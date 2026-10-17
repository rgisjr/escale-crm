"use client";
import { useEffect, useRef } from "react";

/**
 * ABRIR AS CONFIGURAÇÕES DA ORIGEM DE FORA DO PAINEL (fork Escale, Fase 1F, F20).
 *
 * A janela mora no `PainelOrigens` (o ⋮ "Configurações" da origem). A engrenagem
 * da linha de contagem do quadro, que na Clint abre a mesma janela (print 15 da
 * 1E), fica em outro galho da árvore: um evento do navegador liga os dois sem
 * contexto novo no layout. Sem painel montado, ninguém escuta (por isso a
 * página só liga a engrenagem quando o painel existe).
 */
export const EVENTO_DAS_CONFIGURACOES = "escale:configuracoes-da-origem";

export function abrirConfiguracoesDaOrigem(id: string): void {
  window.dispatchEvent(new CustomEvent(EVENTO_DAS_CONFIGURACOES, { detail: { id } }));
}

export function useAoAbrirConfiguracoesDaOrigem(aoAbrir: (id: string) => void): void {
  const ultimo = useRef(aoAbrir);
  useEffect(() => {
    ultimo.current = aoAbrir;
  }, [aoAbrir]);
  useEffect(() => {
    const ouvir = (e: Event) => {
      const id = (e as CustomEvent<{ id?: unknown }>).detail?.id;
      if (typeof id === "string" && id.length > 0) ultimo.current(id);
    };
    window.addEventListener(EVENTO_DAS_CONFIGURACOES, ouvir);
    return () => window.removeEventListener(EVENTO_DAS_CONFIGURACOES, ouvir);
  }, []);
}
