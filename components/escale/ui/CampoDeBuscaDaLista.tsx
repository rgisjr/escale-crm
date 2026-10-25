"use client";
import { useEffect, useRef, useState } from "react";

import { Search } from "@/lib/ui/icons-da-casca";

/**
 * O campo de busca das listas da casca. O texto digitado é estado daqui, não da página: cada tecla
 * renderiza só este campo, e a lista só é avisada (`aoBuscar`) depois da espera.
 */
export function CampoDeBuscaDaLista({
  valorDaUrl,
  aoBuscar,
  rotulo,
  atrasoMs,
  className,
}: {
  valorDaUrl: string;
  aoBuscar: (q: string | null) => void;
  rotulo: string;
  atrasoMs: number;
  className: string;
}) {
  const [busca, setBusca] = useState(valorDaUrl);
  // A versão mais nova dos dois, para o temporizador não usar a da hora em que foi armado.
  const ultimo = useRef({ valorDaUrl, aoBuscar });
  ultimo.current = { valorDaUrl, aoBuscar };

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (busca !== ultimo.current.valorDaUrl) ultimo.current.aoBuscar(busca.trim() || null);
    }, atrasoMs);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só o texto digitado dispara
  }, [busca]);

  return (
    <label className={className}>
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={rotulo}
        aria-label={rotulo}
        className="w-full bg-transparent text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
      />
      <Search size={15} aria-hidden className="shrink-0 text-casca-suave" />
    </label>
  );
}
