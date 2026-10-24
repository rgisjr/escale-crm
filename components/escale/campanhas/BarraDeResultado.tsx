"use client";
import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import {
  dataEHoraBr,
  segmentosDaBarra,
  textoDoSegmento,
  type ChaveDoSegmento,
} from "@/lib/escale/campanhas/apresentacao";
import {
  CLASSE_DO_SEGMENTO,
  CLASSE_DO_TOM,
  CLASSE_DO_TRILHO,
  TOM_DA_DICA_DO_SEGMENTO,
} from "@/lib/escale/campanhas/cores";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";
import { Clock } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { DicaAoPassar } from "./DicaAoPassar";

/**
 * A BARRA DE RESULTADO (002, 008; N6): segmentos erro, entregues, lidos e
 * enviados sobre os adicionados; a dica é desenhada fora do trilho (o trilho
 * corta o que passa da borda). Agendada: o relógio; sem lista: o traço.
 */
export function BarraDeResultado({ linha, fuso }: { linha: LinhaDeCampanha; fuso?: string }) {
  const t = useT();
  const [sobre, setSobre] = useState<ChaveDoSegmento | null>(null);

  if (linha.status === "scheduled" && linha.agendadaPara) {
    const texto = t("Agendada para {data}").replace(
      "{data}",
      dataEHoraBr(linha.agendadaPara, fuso),
    );
    return (
      <DicaAoPassar texto={texto}>
        <span role="img" aria-label={texto} className="inline-flex text-casca-suave">
          <Clock size={16} aria-hidden />
        </span>
      </DicaAoPassar>
    );
  }
  if (linha.adicionados <= 0) return <span className="text-[11px] text-casca-meta">—</span>;

  let inicio = 0;
  const segmentos = segmentosDaBarra(linha).map((s) => {
    const comInicio = { ...s, inicio };
    inicio += s.largura;
    return comInicio;
  });
  const ativo = segmentos.find((s) => s.chave === sobre);
  const resumo = segmentos.length
    ? segmentos.map((s) => textoDoSegmento(s, t)).join(", ")
    : t("Nenhum envio ainda");
  const listras = linha.status === "running";

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
            className={cn("h-full", CLASSE_DO_SEGMENTO[s.chave], listras && "escale-listras")}
          />
        ))}
      </div>
      {ativo ? (
        <span
          role="tooltip"
          style={{ left: `${ativo.inicio + ativo.largura / 2}%` }}
          className={cn(
            "pointer-events-none absolute bottom-full z-20 mb-1.5 -translate-x-1/2 rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
            CLASSE_DO_TOM[TOM_DA_DICA_DO_SEGMENTO[ativo.chave]],
          )}
        >
          {textoDoSegmento(ativo, t)}
        </span>
      ) : null}
    </div>
  );
}
