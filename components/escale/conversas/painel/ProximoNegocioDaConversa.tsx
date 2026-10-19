"use client";
import { useState } from "react";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { etapasDoProximo, vizinhosNaEtapa } from "@/lib/escale/negocio/regras";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import { Check, ChevronLeft, ChevronRight, Funnel } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const SETA =
  "grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia hover:text-casca-texto disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-40";

/** O vizinho que tem conversa; os sem conversa são pulados (N10). */
function vizinhoComConversa(
  leads: readonly Lead[],
  etapaId: string,
  atualId: string,
  lado: "anterior" | "proximo",
): Lead | null {
  let cursor = atualId;
  for (let i = 0; i < leads.length; i++) {
    const v = vizinhosNaEtapa(leads, etapaId, cursor)[lado];
    if (!v) return null;
    if (v.conversa?.id) return v;
    cursor = v.id;
  }
  return null;
}

/** "PRÓXIMO NEGÓCIO" (c02): a etapa pelo funil, o "?" e as setas ‹ › que abrem a conversa do vizinho. */
export function ProximoNegocioDaConversa({
  lead,
  stages,
  leads,
  aoAbrirConversa,
}: {
  lead: Lead | null;
  stages: Stage[];
  leads: Lead[];
  aoAbrirConversa: (id: string | null) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [etapaPedida, setEtapaPedida] = useState<string | null>(null);
  const opcoes = etapasDoProximo(stages);
  const etapaId =
    etapaPedida && opcoes.some((s) => s.id === etapaPedida)
      ? etapaPedida
      : (lead?.stage_id ?? null);
  const anterior = lead && etapaId ? vizinhoComConversa(leads, etapaId, lead.id, "anterior") : null;
  const proximo = lead && etapaId ? vizinhoComConversa(leads, etapaId, lead.id, "proximo") : null;

  return (
    <div className="flex h-12 shrink-0 items-center justify-between">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-casca-sobrelinha uppercase">
        {t("Próximo negócio")}
        <Popover open={aberto} onOpenChange={setAberto}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t("Etapa do próximo negócio")}
              disabled={!lead}
              title={!lead ? t("Sem negócio") : undefined}
              className={cn(SETA, "size-5")}
            >
              <Funnel size={14} aria-hidden />
            </button>
          </PopoverTrigger>
          <PainelSuspenso
            align="start"
            sideOffset={6}
            className="max-h-[370px] w-[158px] overflow-y-auto p-1"
          >
            <ul role="listbox" aria-label={t("Etapa do próximo negócio")}>
              {opcoes.map((s) => (
                <li key={s.id} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={s.id === etapaId}
                    onClick={() => {
                      setEtapaPedida(s.id);
                      setAberto(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs tracking-normal normal-case",
                      s.id === etapaId
                        ? "bg-casca-raia text-casca-marca"
                        : "text-casca-texto hover:bg-casca-raia",
                    )}
                  >
                    <span>{s.name}</span>
                    {s.id === etapaId ? <Check size={14} aria-hidden /> : null}
                  </button>
                </li>
              ))}
            </ul>
          </PainelSuspenso>
        </Popover>
        <AjudaDaCasca
          texto={t(
            "Navegue pela ordem dos seus negócios. Esta seleção não afeta os filtros gerais de atendimento.",
          )}
        />
      </span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          aria-label={t("Negócio anterior")}
          disabled={!anterior}
          title={!anterior ? t("Não há negócio anterior") : undefined}
          onClick={() => anterior && aoAbrirConversa(anterior.conversa!.id)}
          className={SETA}
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={t("Próximo negócio")}
          disabled={!proximo}
          title={!proximo ? t("Não há próximo negócio") : undefined}
          onClick={() => proximo && aoAbrirConversa(proximo.conversa!.id)}
          className={SETA}
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      </span>
    </div>
  );
}
