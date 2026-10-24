"use client";
import { SecaoDoSumario } from "@/components/escale/campanhas/molde/SecaoDoSumario";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import { leuSemResposta } from "@/lib/escale/campanhas/detalhe/apresentacao";
import type { FiltrosDeDestinatarios } from "@/lib/escale/campanhas/detalhe/filtros";
import type { SumarioDaCampanha } from "@/lib/escale/campanhas/detalhe/tipos";

/** "LEU E NÃO RESPONDEU" (010): o percentual sobre enviados, o selo "Oportunidade" e "Ver contatos". */
export function LeuENaoRespondeu({
  sumario,
  aoVerContatos,
}: {
  sumario: SumarioDaCampanha;
  aoVerContatos: (filtros: FiltrosDeDestinatarios) => void;
}) {
  const t = useT();
  const { porcento, quantidade } = leuSemResposta(sumario);
  return (
    <SecaoDoSumario
      titulo={t("Leu e não respondeu")}
      ajuda={t("Contatos que leram a mensagem e ainda não responderam.")}
      direita={
        <span className="shrink-0 rounded-full bg-casca-marca-suave px-2 py-0.5 text-[11px] text-casca-marca">
          {t("Oportunidade")}
        </span>
      }
    >
      <p>
        <span className="text-[18px] font-bold">{porcento === null ? "—" : `${porcento}%`}</span>
        <span className="ml-1 text-[12px] text-casca-suave">· {numeroBr(quantidade)}</span>
      </p>
      <button
        type="button"
        onClick={() => aoVerContatos({ situacoes: ["lida"] })}
        className="mt-2 text-[12px] font-medium text-casca-marca hover:underline"
      >
        {t("Ver contatos")}
      </button>
    </SecaoDoSumario>
  );
}
