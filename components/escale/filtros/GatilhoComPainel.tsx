"use client";
import { useState, type ReactNode } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { GatilhoDeFiltro } from "@/components/escale/ui/GatilhoDeFiltro";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { cn } from "@/lib/utils";

/**
 * UM GATILHO DA BARRA DA CLINT (fork Escale, Casca V4; prints de 15/10 da barra e
 * do Data aberto): o texto com chevron, o selo de contagem quando há critério
 * ("Status 1") e, aberto, o fundo escuro e o painel 12px abaixo, alinhado à
 * esquerda. "Limpar" no pé do painel é nosso: a Clint não mostra como limpar
 * (PRINT 24 e 30).
 */
export function GatilhoComPainel({
  rotulo,
  contagem,
  onLimpar,
  className,
  testId,
  children,
}: {
  rotulo: string;
  contagem: number;
  onLimpar?: () => void;
  className?: string;
  testId?: string;
  children: ReactNode | ((fechar: () => void) => ReactNode);
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const fechar = () => setAberto(false);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <GatilhoDeFiltro
          rotulo={rotulo}
          contagem={contagem > 0 ? contagem : undefined}
          aberto={aberto}
          data-testid={testId}
        />
      </PopoverTrigger>
      <PainelSuspenso
        align="start"
        sideOffset={12}
        aria-label={rotulo}
        className={cn("max-h-[70vh] overflow-y-auto p-4", className)}
      >
        {typeof children === "function" ? children(fechar) : children}
        {onLimpar && contagem > 0 ? (
          <div className="mt-4 flex justify-end border-t border-casca-borda pt-3">
            <BotaoDaCasca type="button" variante="texto" tamanho="sm" onClick={onLimpar}>
              {t("Limpar")}
            </BotaoDaCasca>
          </div>
        ) : null}
      </PainelSuspenso>
    </Popover>
  );
}
