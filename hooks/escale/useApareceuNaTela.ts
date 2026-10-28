"use client";
import { useCallback, useEffect, useRef, useState, type RefCallback } from "react";

const LIMIAR = 0.1;

/**
 * "Já apareceu na tela?" (fork Escale, Fase 7C): cada card de gráfico só consulta depois de aparecer
 * 10%. Liga uma vez e desliga o observador. Sem `IntersectionObserver` (teste, navegador velho), liga já.
 */
export function useApareceuNaTela<T extends Element>(): { ref: RefCallback<T>; apareceu: boolean } {
  const semObservador = typeof IntersectionObserver === "undefined";
  const [apareceu, setApareceu] = useState(semObservador);
  const observador = useRef<IntersectionObserver | null>(null);

  const ref = useCallback<RefCallback<T>>(
    (no) => {
      observador.current?.disconnect();
      observador.current = null;
      if (!no || apareceu || typeof IntersectionObserver === "undefined") return;
      const novo = new IntersectionObserver(
        (entradas) => {
          if (entradas.some((e) => e.isIntersecting)) {
            setApareceu(true);
            novo.disconnect();
          }
        },
        { threshold: LIMIAR },
      );
      novo.observe(no);
      observador.current = novo;
    },
    [apareceu],
  );

  useEffect(() => () => observador.current?.disconnect(), []);
  return { ref, apareceu };
}
