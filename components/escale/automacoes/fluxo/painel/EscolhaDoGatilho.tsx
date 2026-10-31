"use client";
import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import {
  FONTES_DOS_GATILHOS,
  fonteDoEvento,
  type FonteDoGatilho,
} from "@/lib/escale/automacoes/fluxo/gatilhos";
import { cn } from "@/lib/utils";

import { ICONE_DA_FONTE, ICONE_DO_GATILHO } from "../visual-do-fluxo";

/**
 * A ESCOLHA DO GATILHO (07-019, 07-022, 07-024; D8): fontes à esquerda (200 px) e as
 * opções da fonte à direita. Abre na fonte do evento atual.
 */
export function EscolhaDoGatilho({ evento, aoEscolher }: { evento: string; aoEscolher: (evento: string) => void }) {
  const t = useT();
  const [fonte, setFonte] = useState<FonteDoGatilho>(fonteDoEvento(evento));
  const atual = FONTES_DOS_GATILHOS.find((f) => f.fonte === fonte) ?? FONTES_DOS_GATILHOS[0]!;
  return (
    <div className="flex gap-8">
      <nav aria-label={t("Gatilhos")} className="flex w-[200px] shrink-0 flex-col gap-2">
        {FONTES_DOS_GATILHOS.map((f) => {
          const Icone = ICONE_DA_FONTE[f.fonte];
          const ativa = f.fonte === fonte;
          return (
            <button
              key={f.fonte}
              type="button"
              aria-pressed={ativa}
              onClick={() => setFonte(f.fonte)}
              className="flex h-11 items-center gap-3 text-left"
            >
              <span className="grid size-[35px] shrink-0 place-items-center rounded-[9px] border border-casca-divisoria">
                <Icone size={18} className="text-casca-suave" aria-hidden />
              </span>
              <span className={cn("text-[17px]", ativa ? "font-medium text-casca-texto" : "text-casca-texto-2")}>{t(f.rotulo)}</span>
            </button>
          );
        })}
      </nav>
      <div className="min-w-0 flex-1">
        <h3 className="text-[14px] font-semibold text-casca-texto">{t("Gatilhos")}</h3>
        <p className="mb-3 text-[12px] text-casca-suave">{t("Escolha o evento que vai iniciar sua automação")}</p>
        <div className="flex flex-col gap-2">
          {atual.opcoes.map((o) => {
            const Icone = ICONE_DO_GATILHO[o.icone];
            const marcada = o.evento === evento;
            return (
              <button
                key={o.evento}
                type="button"
                aria-pressed={marcada}
                onClick={() => aoEscolher(o.evento)}
                className={cn(
                  "flex w-full max-w-[500px] gap-4 rounded-lg border px-3 py-2.5 text-left hover:bg-casca-raia",
                  marcada ? "border-casca-marca" : "border-casca-divisoria",
                )}
              >
                <Icone size={16} className="mt-0.5 shrink-0 text-casca-suave" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[13px] text-casca-texto">{t(o.titulo)}</span>
                  <span className="block text-[12px] text-casca-suave">{t(o.descricao)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
