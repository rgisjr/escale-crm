"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import {
  PARAM_ETAPA_DO_PROXIMO,
  etapasDoProximo,
  rotaDoNegocio,
  vizinhosNaEtapa,
  type AbaDoNegocio,
} from "@/lib/escale/negocio/regras";
import { tituloDoCard } from "@/lib/escale/quadro/aparencia";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * PRÓXIMO NEGÓCIO (fork Escale, Fase 1G, C8; prints 01 e 11).
 *
 * A etapa começa na do negócio; trocar vai na URL (`pe`). A ordem e o recorte
 * são os do quadro (N11). Código da Clint: `getStageGroupInfo-BptXw8sG.js.txt`.
 */
const SETA =
  "grid size-6 place-items-center rounded-md text-casca-suave hover:bg-casca-raia hover:text-casca-texto disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-40";

export function ProximoNegocio({
  lead,
  etapas,
  leads,
  ordem,
  aba,
}: {
  lead: Lead;
  etapas: Stage[];
  leads: Lead[];
  ordem: ((a: Lead, b: Lead) => number) | undefined;
  aba: AbaDoNegocio;
}) {
  const t = useT();
  const router = useRouter();
  const busca = useSearchParams();
  const qs = busca.toString();
  const [aberto, setAberto] = useState(false);
  const opcoes = etapasDoProximo(etapas);
  const pedida = busca.get(PARAM_ETAPA_DO_PROXIMO);
  const etapaId = pedida && opcoes.some((s) => s.id === pedida) ? pedida : lead.stage_id;
  const etapa = opcoes.find((s) => s.id === etapaId);
  const { anterior, proximo } = vizinhosNaEtapa(leads, etapaId, lead.id, ordem);

  const ir = (destino: Lead) => router.push(rotaDoNegocio(destino.id, qs, { aba, etapa: pedida }));
  const escolher = (id: string) => {
    setAberto(false);
    router.replace(rotaDoNegocio(lead.id, qs, { aba, etapa: id === lead.stage_id ? null : id }), {
      scroll: false,
    });
  };

  return (
    <div className="flex shrink-0 items-center gap-3">
      {aberto ? (
        <span className="flex items-center gap-1.5 text-[10px] text-casca-suave uppercase">
          {t("Próximo negócio")}
          <AjudaDaCasca
            texto={t(
              "O próximo negócio leva em consideração a ordem e os filtros atuais da listagem de negócios.",
            )}
          />
        </span>
      ) : null}
      <div
        className={cn(
          "flex h-8 items-center gap-1 rounded-md border border-casca-borda pr-1 pl-2",
          aberto ? "w-[248px]" : "w-[105px]",
        )}
      >
        <Popover open={aberto} onOpenChange={setAberto}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t("Etapa do próximo negócio")}
              className="flex min-w-0 flex-1 items-center justify-between gap-1 text-[13px] text-casca-texto"
            >
              {aberto ? <span className="truncate">{etapa?.name ?? ""}</span> : null}
              <ChevronDown size={14} aria-hidden className="shrink-0" />
            </button>
          </PopoverTrigger>
          <PainelSuspenso
            align="end"
            sideOffset={6}
            className="max-h-[370px] w-[158px] overflow-y-auto p-1"
          >
            <ul role="listbox" aria-label={t("Etapa do próximo negócio")}>
              {opcoes.map((s) => {
                const escolhida = s.id === etapaId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={escolhida}
                      onClick={() => escolher(s.id)}
                      className={cn(
                        "flex w-full items-start justify-between gap-2 rounded-md px-3 py-2 text-left text-xs",
                        escolhida
                          ? "bg-casca-raia text-casca-marca"
                          : "text-casca-texto hover:bg-casca-raia",
                      )}
                    >
                      <span>{s.name}</span>
                      {escolhida ? <Check size={14} aria-hidden className="shrink-0" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </PainelSuspenso>
        </Popover>
        <button
          type="button"
          aria-label={t("Negócio anterior")}
          disabled={!anterior}
          title={
            anterior ? tituloDoCard(anterior) : t("Não existem negócios anteriores nesta etapa.")
          }
          onClick={() => anterior && ir(anterior)}
          className={SETA}
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={t("Próximo negócio")}
          disabled={!proximo}
          title={proximo ? tituloDoCard(proximo) : t("Não existem próximos negócios nesta etapa.")}
          onClick={() => proximo && ir(proximo)}
          className={SETA}
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
