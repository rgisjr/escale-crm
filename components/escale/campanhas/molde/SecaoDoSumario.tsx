import type { ReactNode } from "react";

import { SinalDeAjuda } from "./CartaoDoSumario";
import { CLASSE_DO_BLOCO } from "./estilos";

/**
 * O BLOCO LARGO DO SUMÁRIO (fork Escale, Fase 8C; 009, 010): título (13px, ou
 * 15px em "Motivos do erro"), o "?" e o selo junto dele; à direita a legenda
 * cinza ("% sobre enviados") ou outro nó (o selo "Oportunidade").
 */
export function SecaoDoSumario({
  titulo,
  ajuda,
  selo,
  legenda,
  direita,
  tituloGrande = false,
  children,
}: {
  titulo: string;
  ajuda?: string;
  selo?: ReactNode;
  legenda?: string;
  direita?: ReactNode;
  tituloGrande?: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-label={titulo} className={CLASSE_DO_BLOCO}>
      <header className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <h3 className={tituloGrande ? "text-[15px] font-semibold" : "text-[13px] font-semibold"}>
            {titulo}
          </h3>
          {ajuda ? <SinalDeAjuda texto={ajuda} /> : null}
          {selo}
        </span>
        {direita ??
          (legenda ? (
            <span className="shrink-0 text-[11px] text-casca-suave">{legenda}</span>
          ) : null)}
      </header>
      <div className="mt-3">{children}</div>
    </section>
  );
}
