"use client";
import { useState } from "react";

import { CalendarioDePeriodo, type TipoDeData } from "@/components/escale/ui/CalendarioDePeriodo";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { textoDoPeriodo } from "@/lib/escale/contatos/filtros";
import { Calendar, X } from "@/lib/ui/icons-da-casca";

type Valor<T extends TipoDeData> = { tipo: T; de?: string; ate?: string };

/**
 * O CAMPO DE DATA DO PAINEL (c32, c66, c76): o gatilho de 32px "Selecione uma data"
 * e o calendário da casca. Sem `tipos`, sem abas (Conversas); com `tipos`, só as
 * abas pedidas (Negócios: criação, ganho, perda). Trocar de aba sem datas não filtra.
 */
export function CampoDePeriodoDaFila<T extends TipoDeData>({
  rotulo,
  valor,
  aoMudar,
  tipos,
}: {
  rotulo: string;
  valor: Valor<T> | null;
  aoMudar: (v: Valor<T> | null) => void;
  tipos?: readonly T[];
}) {
  const t = useT();
  const [tipo, setTipo] = useState<T>(valor?.tipo ?? tipos?.[0] ?? ("criacao" as T));
  const atual = valor && valor.tipo === tipo ? valor : { tipo };
  return (
    <span className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={rotulo}
            className="flex h-8 w-full items-center justify-between rounded-casca-gatilho bg-casca-busca px-2.5 text-left text-[13px]"
          >
            <span className={valor ? "text-casca-texto" : "text-casca-meta"}>
              {valor ? textoDoPeriodo(valor) : t("Selecione uma data")}
            </span>
            <Calendar size={14} aria-hidden className="text-casca-suave" />
          </button>
        </PopoverTrigger>
        <PainelSuspenso className="w-auto p-0">
          <CalendarioDePeriodo
            valor={atual}
            semAbas={!tipos}
            tiposDisponiveis={tipos ? [...tipos] : undefined}
            soDisponiveis
            aoMudar={(p) => {
              setTipo(p.tipo as T);
              aoMudar(
                p.de || p.ate
                  ? {
                      tipo: p.tipo as T,
                      ...(p.de ? { de: p.de } : {}),
                      ...(p.ate ? { ate: p.ate } : {}),
                    }
                  : null,
              );
            }}
          />
        </PainelSuspenso>
      </Popover>
      {valor ? (
        <button
          type="button"
          aria-label={`${t("Limpar")} ${rotulo}`}
          onClick={() => aoMudar(null)}
          className="grid size-6 place-items-center text-casca-suave hover:text-casca-texto"
        >
          <X size={14} aria-hidden />
        </button>
      ) : null}
    </span>
  );
}
