"use client";
import { useEffect, useState } from "react";

export const ATRASO_DA_BUSCA_MS = 300;

/** O valor só muda depois de `ms` sem novas mudanças: uma consulta por pausa na digitação, não por tecla. */
export function useValorComAtraso<T>(valor: T, ms: number = ATRASO_DA_BUSCA_MS): T {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(id);
  }, [valor, ms]);
  return atrasado;
}
