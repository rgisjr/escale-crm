"use client";
import { DicaAoPassar } from "@/components/escale/campanhas/DicaAoPassar";
import { useT } from "@/hooks/i18n/useT";
import { CLASSE_DO_TOM } from "@/lib/escale/campanhas/cores";
import { ROTULO_DA_SITUACAO, TOM_DA_SITUACAO } from "@/lib/escale/campanhas/detalhe/apresentacao";
import { textoDoMotivoDaLinha } from "@/lib/escale/campanhas/detalhe/motivos";
import type { SituacaoDoDestinatario } from "@/lib/escale/campanhas/detalhe/tipos";
import { cn } from "@/lib/utils";

/** O SELO DA LINHA (012: "Lido" verde): o tom da situação; erro e fora da lista com o motivo na dica. */
export function SeloDaSituacao({
  situacao,
  motivo,
}: {
  situacao: SituacaoDoDestinatario;
  motivo: string | null;
}) {
  const t = useT();
  const dica = textoDoMotivoDaLinha(situacao, motivo, t);
  const selo = (
    <span
      data-situacao={situacao}
      className={cn(
        "inline-flex h-[22px] items-center rounded-[4px] px-1.5 text-[12px] leading-none whitespace-nowrap",
        CLASSE_DO_TOM[TOM_DA_SITUACAO[situacao]],
      )}
    >
      {t(ROTULO_DA_SITUACAO[situacao])}
    </span>
  );
  return dica ? <DicaAoPassar texto={dica}>{selo}</DicaAoPassar> : selo;
}
