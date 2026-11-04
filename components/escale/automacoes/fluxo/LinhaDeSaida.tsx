"use client";
import { Handle, Position } from "@xyflow/react";
import type { ReactNode } from "react";

import type { SaidaDoNo } from "@/lib/escale/automacoes/fluxo/caixas";
import { cn } from "@/lib/utils";

/** Uma saída do nó: a linha (o botão, o grupo, "Próximo passo", "Não respondeu") com a alça à direita, na altura dela. */
export function LinhaDeSaida({
  saida,
  dentro = false,
  className,
  children,
}: {
  saida: SaidaDoNo;
  /** A linha está dentro do corpo (com margem de 20 px): a alça vai até a borda do cartão. */
  dentro?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("relative", className)} data-testid={`saida-${saida}`}>
      {children}
      <Handle type="source" position={Position.Right} id={saida} style={{ top: "50%", ...(dentro ? { right: -24 } : {}) }} />
    </div>
  );
}
