"use client";
import type { ReactNode } from "react";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import type { LucideIcon } from "@/lib/ui/icons-da-casca";

/**
 * O topo de uma subaba (P01 e P07: o quadrado lilás de 34px com o ícone, o
 * texto 13px/500 e o "?"; P10: o quadrado, o título 13px/500 e a descrição
 * 11px embaixo). Sem ícone, fica só o texto.
 */
export function CabecaDaSecao({
  icone: Icone,
  titulo,
  descricao,
  ajuda,
  acao,
}: {
  icone?: LucideIcon;
  titulo?: string;
  descricao: string;
  ajuda?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 pb-5">
      {Icone ? (
        <span className="grid size-[34px] shrink-0 place-items-center rounded-[6px] bg-casca-marca-suave text-casca-meta">
          <Icone size={18} aria-hidden />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        {titulo ? <h3 className="text-[13px] font-medium text-casca-texto">{titulo}</h3> : null}
        <p
          className={
            titulo
              ? "text-[11px] text-casca-suave"
              : "flex items-center gap-1.5 pt-2 text-[13px] font-medium text-casca-texto"
          }
        >
          {descricao}
          {ajuda ? <AjudaDaCasca texto={ajuda} /> : null}
        </p>
      </div>
      {acao}
    </div>
  );
}
