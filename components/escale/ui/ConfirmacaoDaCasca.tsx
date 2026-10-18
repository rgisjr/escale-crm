"use client";
import { useState, type ReactNode } from "react";

import { BotaoDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";

import { PainelSuspenso } from "./PainelSuspenso";

/**
 * O BALÃO DE CONFIRMAÇÃO DA CLINT (fork Escale, Fase 1K; o Popover xs da
 * lixeira e do "Resetar distribuição"): a pergunta 13px e, embaixo à direita,
 * "Não" e "Sim". O gatilho é o filho. Sem print: segue o código da Clint.
 */
export function ConfirmacaoDaCasca({
  texto,
  aoConfirmar,
  children,
}: {
  texto: string;
  aoConfirmar: () => void;
  children: ReactNode;
}) {
  const t = useT();
  const [aberta, setAberta] = useState(false);
  return (
    <Popover open={aberta} onOpenChange={setAberta}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PainelSuspenso align="end" className="w-[280px] p-3">
        <p className="text-[13px] leading-5 text-casca-texto">{texto}</p>
        <div className="mt-3 flex justify-end gap-2">
          <BotaoDaJanela variante="cancelar" onClick={() => setAberta(false)}>
            {t("Não")}
          </BotaoDaJanela>
          <BotaoDaJanela
            variante="salvar"
            onClick={() => {
              setAberta(false);
              aoConfirmar();
            }}
          >
            {t("Sim")}
          </BotaoDaJanela>
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
