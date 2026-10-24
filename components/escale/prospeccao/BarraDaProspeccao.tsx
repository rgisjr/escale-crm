"use client";
import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import {
  CLASSE_DO_SEGMENTO,
  CLASSE_DO_TOM,
  CLASSE_DO_TRILHO,
  TOM_DA_DICA_DO_SEGMENTO,
} from "@/lib/escale/campanhas/cores";
import {
  COR_DO_SEGMENTO_DA_PROSPECCAO,
  segmentosDaProspeccao,
  textoDoSegmentoDaProspeccao,
  type ChaveDaProspeccao,
} from "@/lib/escale/prospeccao/apresentacao";
import type { LinhaDeProspeccao } from "@/lib/escale/prospeccao/tipos";
import { cn } from "@/lib/utils";

/**
 * A BARRA DE RESULTADO DA PROSPECÇÃO (molde 002/008; D5): falhas, abordadas,
 * responderam e qualificadas sobre as encontradas, com as cores e a dica da
 * barra de WhatsApp (8A). Em progresso, as listras.
 */
export function BarraDaProspeccao({ linha }: { linha: LinhaDeProspeccao }) {
  const t = useT();
  const [sobre, setSobre] = useState<ChaveDaProspeccao | null>(null);
  if (linha.encontradas <= 0) return <span className="text-[11px] text-casca-meta">—</span>;

  const puros = segmentosDaProspeccao(linha);
  const segmentos = puros.map((s, i) => ({
    ...s,
    inicio: puros.slice(0, i).reduce((soma, anterior) => soma + anterior.largura, 0),
  }));
  const ativo = segmentos.find((s) => s.chave === sobre);
  const resumo = segmentos.length
    ? segmentos.map((s) => textoDoSegmentoDaProspeccao(s, t)).join(", ")
    : t("Nenhuma abordagem ainda");
  const listras = linha.situacao === "em_progresso";

  return (
    <div className="relative w-full max-w-[230px] min-w-[140px]">
      <div
        role="img"
        aria-label={resumo}
        className={cn("flex h-2 w-full overflow-hidden rounded-full", CLASSE_DO_TRILHO)}
      >
        {segmentos.map((s) => (
          <span
            key={s.chave}
            aria-hidden
            data-segmento={s.chave}
            onMouseEnter={() => setSobre(s.chave)}
            onMouseLeave={() => setSobre(null)}
            style={{ width: `${s.largura}%` }}
            className={cn(
              "h-full",
              CLASSE_DO_SEGMENTO[COR_DO_SEGMENTO_DA_PROSPECCAO[s.chave]],
              listras && "escale-listras",
            )}
          />
        ))}
      </div>
      {ativo ? (
        <span
          role="tooltip"
          style={{ left: `${ativo.inicio + ativo.largura / 2}%` }}
          className={cn(
            "pointer-events-none absolute bottom-full z-20 mb-1.5 -translate-x-1/2 rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
            CLASSE_DO_TOM[TOM_DA_DICA_DO_SEGMENTO[COR_DO_SEGMENTO_DA_PROSPECCAO[ativo.chave]]],
          )}
        >
          {textoDoSegmentoDaProspeccao(ativo, t)}
        </span>
      ) : null}
    </div>
  );
}
