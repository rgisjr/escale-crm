"use client";
import { useState, type ReactNode } from "react";

import { ChevronDown, ChevronUp, type LucideIcon } from "@/lib/ui/icons-da-casca";

export const TITULO_DO_CAMPO = "mb-2 text-[13px] text-casca-texto";
export const AJUDA_DO_CAMPO = "mt-1 text-[12px] text-casca-suave";

/** O acordeão da aba Opções (10-015, 10-040): título em negrito, ícone à esquerda e a seta; aberto por padrão. */
export function Acordeao({
  titulo,
  Icone,
  children,
  acao,
}: {
  titulo: string;
  Icone: LucideIcon;
  children: ReactNode;
  /** Fase 7E: o interruptor de "Metas" no cabeçalho. */
  acao?: ReactNode;
}) {
  const [aberto, setAberto] = useState(true);
  return (
    <section className="border-b border-casca-divisoria">
      <div className="flex h-12 items-center gap-2">
        <button
          type="button"
          aria-expanded={aberto}
          onClick={() => setAberto(!aberto)}
          className="flex h-12 flex-1 items-center gap-2 text-left"
        >
          <Icone size={16} aria-hidden className="text-casca-suave" />
          <span className="flex-1 text-[14px] font-bold text-casca-texto">{titulo}</span>
          {aberto ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
        </button>
        {acao}
      </div>
      {aberto ? <div className="flex flex-col gap-5 py-6">{children}</div> : null}
    </section>
  );
}
