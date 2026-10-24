"use client";
import { useState } from "react";

import { CalendarioDePeriodo } from "@/components/escale/ui/CalendarioDePeriodo";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import type { PeriodoDoFiltro } from "@/lib/escale/campanhas/filtros";
import { textoDoPeriodo } from "@/lib/escale/contatos/filtros";
import { Calendar, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O CAMPO DE DATA DA BARRA (002, 006): 215px, o texto da Clint cortado com
 * reticências, o calendário da casca com os atalhos e dois meses, sem abas
 * (nunca o controle nativo). O X ao lado limpa (provisório: a Clint não mostra).
 */
export function CampoDeDataDasCampanhas({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: PeriodoDoFiltro | undefined;
  aoMudar: (p: PeriodoDoFiltro | undefined) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  return (
    <span className="inline-flex items-center gap-1">
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={rotulo}
            className={cn(
              "flex h-8 w-[215px] items-center justify-between gap-2 rounded-casca-gatilho border px-2.5 text-left text-[13px]",
              aberto ? "border-casca-marca bg-surface" : "border-transparent bg-casca-busca",
            )}
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                valor ? "text-casca-texto" : "text-casca-meta",
              )}
            >
              {valor ? textoDoPeriodo(valor) : rotulo}
            </span>
            <Calendar size={14} aria-hidden className="shrink-0 text-casca-texto-2" />
          </button>
        </PopoverTrigger>
        <PainelSuspenso className="w-auto p-0">
          <CalendarioDePeriodo
            valor={{ tipo: "agendado", ...(valor ?? {}) }}
            semAbas
            aoMudar={(p) =>
              aoMudar(
                p.de || p.ate
                  ? { ...(p.de ? { de: p.de } : {}), ...(p.ate ? { ate: p.ate } : {}) }
                  : undefined,
              )
            }
          />
        </PainelSuspenso>
      </Popover>
      {valor ? (
        <button
          type="button"
          aria-label={`${t("Limpar")} ${rotulo}`}
          onClick={() => aoMudar(undefined)}
          className="grid size-6 place-items-center text-casca-suave hover:text-casca-texto"
        >
          <X size={14} aria-hidden />
        </button>
      ) : null}
    </span>
  );
}
