"use client";
import type { ReactNode } from "react";

import type { Lead } from "@/lib/types/leads";

import { FotoDaFicha } from "./FotoDaFicha";
import { NomeDaFicha } from "./NomeDaFicha";

/**
 * O CABEÇALHO DA FICHA (fork Escale, Fase 1G; print 01): foto, nome do contato
 * (o mesmo nome do card) e o lápis ("Editar nome", 1H: `NomeDaFicha`). À
 * direita, o PR B põe o contador, o status, o dono e o ⋮ (C4 a C7).
 */
export function CabecalhoDaFicha({
  lead,
  pipelineId,
  direita,
}: {
  lead: Lead;
  pipelineId: string;
  direita?: ReactNode;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-casca-borda px-6">
      <div className="flex min-w-0 items-center gap-3">
        <FotoDaFicha lead={lead} />
        {/* Print 01: o lápis (12px) fica a ~9px do fim do nome; o botão de 24px já traz 6px de respiro. */}
        <NomeDaFicha lead={lead} pipelineId={pipelineId} />
      </div>
      {direita ? <div className="flex shrink-0 items-center gap-3">{direita}</div> : null}
    </div>
  );
}
