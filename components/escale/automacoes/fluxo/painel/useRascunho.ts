"use client";
import { useEffect, useState } from "react";

/** Tira o que é só de tela (`problemas`) antes de comparar o rascunho com o nó. */
function semProblemas(valor: unknown): string {
  return JSON.stringify(valor, (chave, v: unknown) => (chave === "problemas" ? undefined : v));
}

/**
 * O RASCUNHO DO PAINEL (D13): uma cópia dos dados do nó que o painel edita. "Salvar"
 * aplica a cópia no nó; "Cancelar" a descarta. `aoMudar` avisa a tela quando o
 * rascunho difere do nó (o guarda "Configuração … não salva").
 */
export function useRascunho<T>(inicial: T, aoMudar?: (sujo: boolean) => void) {
  const [rascunho, setRascunho] = useState<T>(inicial);
  const sujo = semProblemas(rascunho) !== semProblemas(inicial);
  useEffect(() => {
    aoMudar?.(sujo);
  }, [sujo, aoMudar]);
  return { rascunho, setRascunho, sujo };
}
