"use client";
import type { ReactNode } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { tituloDoCard } from "@/lib/escale/quadro/aparencia";
import type { Lead } from "@/lib/types/leads";
import { Pencil } from "@/lib/ui/icons-da-casca";

import { FotoDaFicha } from "./FotoDaFicha";

/**
 * O CABEÇALHO DA FICHA (fork Escale, Fase 1G; print 01): foto, nome do contato
 * (o mesmo nome do card) e o lápis ("Editar nome", 1H). À direita, o PR B põe
 * o contador, o status, o dono e o ⋮ (C4 a C7).
 */
export function CabecalhoDaFicha({ lead, direita }: { lead: Lead; direita?: ReactNode }) {
  const t = useT();
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-casca-borda px-6">
      <div className="flex min-w-0 items-center gap-3">
        <FotoDaFicha lead={lead} />
        {/* Print 01: o lápis (12px) fica a ~9px do fim do nome; o botão de 24px já traz 6px de respiro. */}
        <div className="flex min-w-0 items-center gap-[3px]">
          <h1 className="truncate text-[15px] font-normal text-casca-texto">
            {tituloDoCard(lead)}
          </h1>
          <BotaoDaCasca
            variante="icone"
            tamanho="sm"
            disabled
            title={t("Em breve")}
            aria-label={t("Editar nome")}
            className="disabled:pointer-events-auto disabled:cursor-not-allowed [&_svg]:size-3!"
          >
            <Pencil aria-hidden />
          </BotaoDaCasca>
        </div>
      </div>
      {direita ? <div className="flex shrink-0 items-center gap-3">{direita}</div> : null}
    </div>
  );
}
