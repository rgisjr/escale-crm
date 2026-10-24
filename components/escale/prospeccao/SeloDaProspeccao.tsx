"use client";
import { DicaAoPassar } from "@/components/escale/campanhas/DicaAoPassar";
import { useT } from "@/hooks/i18n/useT";
import type { TomDoStatus } from "@/lib/escale/campanhas/apresentacao";
import { CLASSE_DO_TOM } from "@/lib/escale/campanhas/cores";
import {
  DICA_DA_SITUACAO,
  ROTULO_DA_SITUACAO,
  ROTULO_DO_PROGRESSO,
  SITUACOES_QUE_PULSAM,
  TOM_DA_SITUACAO,
  TOM_DO_PROGRESSO,
} from "@/lib/escale/prospeccao/apresentacao";
import type { ProgressoDaEmpresa, SituacaoDaProspeccao } from "@/lib/escale/prospeccao/tipos";
import { cn } from "@/lib/utils";

/** O selo do molde 002 (22px, canto 4px, 12px), com os tons da 8A. */
function Selo({
  rotulo,
  tom,
  pulsa = false,
}: {
  rotulo: string;
  tom: TomDoStatus;
  pulsa?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center rounded-[4px] px-1.5 text-[12px] leading-none whitespace-nowrap",
        CLASSE_DO_TOM[tom],
        pulsa && "motion-safe:animate-pulse",
      )}
    >
      {rotulo}
    </span>
  );
}

/** A situação da prospecção (D3), com a dica. */
export function SeloDaSituacao({ situacao }: { situacao: SituacaoDaProspeccao }) {
  const t = useT();
  return (
    <DicaAoPassar texto={t(DICA_DA_SITUACAO[situacao])}>
      <Selo
        rotulo={t(ROTULO_DA_SITUACAO[situacao])}
        tom={TOM_DA_SITUACAO[situacao]}
        pulsa={SITUACOES_QUE_PULSAM.has(situacao)}
      />
    </DicaAoPassar>
  );
}

/** O progresso de uma empresa (aba Detalhes). */
export function SeloDoProgresso({ progresso }: { progresso: ProgressoDaEmpresa }) {
  const t = useT();
  return <Selo rotulo={t(ROTULO_DO_PROGRESSO[progresso])} tom={TOM_DO_PROGRESSO[progresso]} />;
}
