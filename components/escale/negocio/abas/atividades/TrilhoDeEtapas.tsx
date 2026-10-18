"use client";
import { useRef } from "react";

import { DicaEscura } from "@/components/escale/origens/DicaEscura";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { tituloDoCard } from "@/lib/escale/quadro/aparencia";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import { Check, ChevronRight } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { FotoDaFicha } from "../../FotoDaFicha";

/**
 * O TRILHO DAS ETAPAS (fork Escale, Fase 1I; print G01, P12). Clicar numa
 * etapa só MOSTRA as atividades dela (mover pelo trilho fica fora, Q6). A atual
 * tem a foto do contato com "{nome} está aqui"; as anteriores, ✓.
 */
export function TrilhoDeEtapas({
  lead,
  etapas,
  vista,
  aoVer,
}: {
  lead: Lead;
  etapas: Stage[];
  vista: string;
  aoVer: (id: string) => void;
}) {
  const t = useT();
  const trilho = useRef<HTMLOListElement>(null);
  const posicaoAtual = etapas.findIndex((s) => s.id === lead.stage_id);
  const primeiroNome = tituloDoCard(lead).trim().split(/\s+/)[0] ?? "";

  return (
    <div className="relative flex h-[98px] shrink-0 border-b border-casca-borda">
      <ol
        ref={trilho}
        aria-label={t("Etapas da origem")}
        className="flex min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto px-6 pt-3"
      >
        {etapas.map((s, i) => {
          const atual = s.id === lead.stage_id;
          const passada = posicaoAtual >= 0 && i < posicaoAtual;
          const vendo = s.id === vista;
          return (
            <li
              key={s.id}
              aria-current={atual ? "step" : undefined}
              className="relative flex w-[154px] shrink-0 flex-col items-center gap-2"
            >
              {i > 0 && (
                <span
                  aria-hidden
                  className="absolute top-3 right-1/2 h-px w-full bg-casca-marca-media"
                />
              )}
              <button
                type="button"
                aria-pressed={vendo}
                onClick={() => aoVer(s.id)}
                className="relative z-[1] flex flex-col items-center gap-2"
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full border text-[11px] font-semibold",
                    atual
                      ? "border-casca-marca bg-casca-marca text-white"
                      : passada
                        ? "border-casca-marca bg-casca-marca-media text-casca-marca"
                        : "border-casca-marca-media bg-surface text-casca-marca",
                    vendo && !atual && "ring-2 ring-casca-marca",
                  )}
                >
                  {passada ? <Check size={12} aria-hidden /> : i + 1}
                </span>
                <span
                  className={cn(
                    "max-w-[146px] truncate px-1 text-xs",
                    vendo ? "font-semibold text-casca-marca" : "text-casca-texto-2",
                  )}
                >
                  {s.name}
                </span>
              </button>
              {atual ? (
                <DicaEscura texto={t("{nome} está aqui").replace("{nome}", primeiroNome)}>
                  <span>
                    <FotoDaFicha lead={lead} tamanho="trilho" />
                  </span>
                </DicaEscura>
              ) : null}
            </li>
          );
        })}
      </ol>
      <BotaoDaCasca
        variante="icone"
        aria-label={t("Mais etapas")}
        title={t("Mais etapas")}
        onClick={() => trilho.current?.scrollBy({ left: 400, behavior: "smooth" })}
        className="absolute top-3 right-4 border border-casca-borda bg-surface shadow-casca-painel"
      >
        <ChevronRight aria-hidden />
      </BotaoDaCasca>
    </div>
  );
}
