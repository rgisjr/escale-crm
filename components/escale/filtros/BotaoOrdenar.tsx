"use client";
import { useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import type { CampoFiltravel } from "@/lib/escale/filtros/campos";
import type { CriterioDeOrdem } from "@/lib/escale/filtros/tipos";
import { ArrowUpDown } from "@/lib/ui/icons-da-casca";

import { PainelDeOrdem } from "./OrdenarCards";

/**
 * O BOTÃO "↑↓ ORDENAR" DA LINHA DE CONTAGEM (fork Escale, Fase 1E, E15; Clint v2,
 * prints `v2-01` e `v2-19`): 32px, borda de 1px, raio 6, ícone de 14px na cor da
 * marca. O painel abre embaixo, alinhado à direita, com a ordenação da 1D
 * (`PainelDeOrdem`). Antes (V4) ela morava no menu da engrenagem.
 */
export function BotaoOrdenar({
  ordem,
  campos,
  onAplicar,
}: {
  ordem: readonly CriterioDeOrdem[] | undefined;
  campos: readonly CampoFiltravel[];
  onAplicar: (ordem: CriterioDeOrdem[] | undefined) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <BotaoDaCasca
          type="button"
          variante="texto"
          aria-label={t("Ordenar")}
          className="h-8 gap-1.5 border border-casca-borda px-3 text-[13px] text-casca-texto"
        >
          <ArrowUpDown size={14} aria-hidden className="text-casca-marca" />
          {t("Ordenar")}
        </BotaoDaCasca>
      </PopoverTrigger>
      <PainelSuspenso
        align="end"
        aria-label={t("Ordenar por")}
        className="w-[min(520px,calc(100vw-2rem))] p-4"
      >
        <PainelDeOrdem
          ordem={ordem}
          campos={campos}
          onAplicar={(proxima) => {
            onAplicar(proxima);
            setAberto(false);
          }}
          onCancelar={() => setAberto(false)}
        />
      </PainelSuspenso>
    </Popover>
  );
}
