"use client";
import { useState } from "react";

import { CalendarioDePeriodo, type Periodo as PeriodoDoCalendario } from "@/components/escale/ui/CalendarioDePeriodo";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import {
  ATALHOS_DO_EDITOR,
  ROTULO_DO_ATALHO_DO_EDITOR,
  periodoPadrao,
  textoDoPersonalizado,
} from "@/lib/escale/indicadores/editor/periodo-do-editor";
import { periodoDoCalendario } from "@/lib/escale/indicadores/painel/filtro";
import type { Periodo } from "@/lib/escale/indicadores/pergunta";
import { periodoDoAtalho } from "@/lib/escale/ui/periodos";
import { CalendarDays, X } from "@/lib/ui/icons-da-casca";

/** O período do editor (10-054, 10-055): atalhos da Clint e, em "Personalizado", o campo com o calendário de um mês. */
export function SeletorDePeriodoDoEditor({ periodo, aoMudar }: { periodo: Periodo; aoMudar: (p: Periodo) => void }) {
  const t = useT();
  const [calendario, setCalendario] = useState(false);
  const [parcial, setParcial] = useState<PeriodoDoCalendario | null>(null);
  const listado = (ATALHOS_DO_EDITOR as readonly string[]).includes(periodo.atalho);
  // Um atalho que o editor não lista (vindo do calendário) aparece com o rótulo dele e "Personalizado" marcado.
  const opcoes = [
    ...ATALHOS_DO_EDITOR.map((a) => ({ valor: a as string, rotulo: t(ROTULO_DO_ATALHO_DO_EDITOR[a]) })),
    ...(listado ? [] : [{ valor: periodo.atalho as string, rotulo: t(ROTULO_DO_ATALHO_DO_EDITOR[periodo.atalho]), desabilitada: true }]),
  ];
  const personalizado = periodo.atalho === "personalizado";

  function escolher(valor: string) {
    if (valor === "personalizado") {
      const mes = periodoDoAtalho("esse-mes", new Date());
      aoMudar({ atalho: "personalizado", de: mes.de, ate: mes.ate });
      return;
    }
    aoMudar({ atalho: valor as Periodo["atalho"] });
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-[112px]">
        <SeletorDaCasca
          aria-label={t("Período")}
          className="h-8 bg-casca-busca"
          valor={periodo.atalho}
          opcoes={opcoes}
          aoMudar={(v) => v && escolher(v)}
        />
      </div>
      {personalizado ? (
        <Popover
          open={calendario}
          onOpenChange={(a) => {
            setCalendario(a);
            if (!a) setParcial(null);
          }}
        >
          <PopoverTrigger asChild>
            <div className="flex h-8 w-[200px] items-center gap-2 rounded-[4px] bg-casca-busca px-3 text-[13px] text-casca-texto">
              <button type="button" aria-label={t("Período personalizado")} className="min-w-0 flex-1 truncate text-left outline-hidden">
                {textoDoPersonalizado(periodo) || "dd/mm/aaaa - dd/mm/aaaa"}
              </button>
              <button
                type="button"
                aria-label={t("Limpar período")}
                onClick={(e) => {
                  e.stopPropagation();
                  aoMudar(periodoPadrao());
                }}
                className="grid shrink-0 place-items-center"
              >
                <X size={14} aria-hidden />
              </button>
              <CalendarDays size={14} aria-hidden className="shrink-0 text-casca-suave" />
            </div>
          </PopoverTrigger>
          <PainelSuspenso className="w-auto p-0">
            <CalendarioDePeriodo
              semAbas
              umMes
              valor={parcial ?? { tipo: "criacao", ...(periodo.de ? { de: periodo.de } : {}), ...(periodo.ate ? { ate: periodo.ate } : {}) }}
              aoMudar={(p) => {
                if (p.de && p.ate) {
                  aoMudar(periodoDoCalendario(p.de, p.ate, new Date()));
                  setParcial(null);
                  setCalendario(false);
                } else {
                  setParcial(p);
                }
              }}
            />
          </PainelSuspenso>
        </Popover>
      ) : null}
    </div>
  );
}
