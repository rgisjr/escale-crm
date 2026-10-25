"use client";
import type { ReactNode } from "react";

/** Rótulo 12px/500 e a caixa de 36px (c14, c17). */
export function CampoDaSecao({ rotulo, children }: { rotulo: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[14px] font-medium text-casca-texto">{rotulo}</span>
      <div className="[&_[role=combobox]]:h-9 [&_input]:h-9">{children}</div>
    </div>
  );
}
