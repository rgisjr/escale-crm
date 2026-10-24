"use client";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import { CLASSE_DO_TRILHO_DO_FUNIL } from "@/lib/escale/campanhas/detalhe/cores";
import { cn } from "@/lib/utils";

import { SecaoDoSumario } from "./SecaoDoSumario";

export interface EtapaDoFunilDoMolde {
  chave: string;
  rotulo: string;
  quantidade: number;
  porcento: number | null;
}

/**
 * O FUNIL DE CONVERSÃO (fork Escale, Fase 8C; 009): uma linha por etapa com
 * "n · p%" e a barra grossa na cor da marca sobre o trilho. A 8D passa as
 * etapas dela e a legenda ("% sobre encontradas").
 */
export function FunilDeConversao({
  etapas,
  titulo,
  legenda,
}: {
  etapas: readonly EtapaDoFunilDoMolde[];
  titulo?: string;
  legenda?: string;
}) {
  const t = useT();
  return (
    <SecaoDoSumario
      titulo={titulo ?? t("Funil de conversão")}
      legenda={legenda ?? t("% sobre enviados")}
    >
      <ul className="space-y-3.5">
        {etapas.map((e) => (
          <li key={e.chave} data-etapa={e.chave}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-medium">{e.rotulo}</span>
              <span className="text-[12px] text-casca-texto">
                {`${numeroBr(e.quantidade)} · ${e.porcento === null ? "—" : `${e.porcento}%`}`}
              </span>
            </div>
            <div
              className={cn("mt-1.5 h-3 overflow-hidden rounded-full", CLASSE_DO_TRILHO_DO_FUNIL)}
            >
              <div
                data-barra
                className="h-full rounded-full bg-casca-marca"
                style={{ width: `${Math.min(100, Math.max(0, e.porcento ?? 0))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </SecaoDoSumario>
  );
}
