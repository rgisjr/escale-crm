"use client";
import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import { numeros } from "@/lib/escale/indicadores/graficos/dados";
import { formatarValor } from "@/lib/escale/indicadores/graficos/formatos";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import { Triangle } from "@/lib/ui/icons-da-casca";

/**
 * Número (prints 10-006, 10-035): o valor centralizado. Com 2 indicadores, o carrossel vertical da
 * Clint mostra um por vez, com ▲ ▼ no trilho à direita (comportamento inferido da captura: provisório).
 */
export function GraficoNumero({ resultado }: { resultado: Resultado }) {
  const t = useT();
  const itens = numeros(resultado);
  const [atual, setAtual] = useState(0);
  const item = itens[atual] ?? itens[0];
  if (!item) return null;
  const seta = "grid size-4 place-items-center text-casca-suave hover:text-casca-texto disabled:opacity-40";
  return (
    <div className="relative flex h-full items-center justify-center">
      <p className="text-[20px] font-medium text-casca-texto">
        {formatarValor(item.valor, item.unidade)}
        <span className="sr-only"> {item.nome}</span>
      </p>
      {itens.length > 1 ? (
        <div className="absolute top-1/2 right-1 flex -translate-y-1/2 flex-col items-center gap-1">
          <button type="button" aria-label={t("Indicador anterior")} disabled={atual === 0} onClick={() => setAtual(atual - 1)} className={seta}>
            <Triangle size={8} aria-hidden className="fill-current" />
          </button>
          <span aria-hidden className="h-[10px] w-[6px] rounded-full bg-casca-suave" />
          <button type="button" aria-label={t("Próximo indicador")} disabled={atual === itens.length - 1} onClick={() => setAtual(atual + 1)} className={seta}>
            <Triangle size={8} aria-hidden className="rotate-180 fill-current" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
