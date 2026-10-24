"use client";
import { CartaoDoSumario } from "@/components/escale/campanhas/molde/CartaoDoSumario";
import { TituloDaSecao } from "@/components/escale/campanhas/molde/TituloDaSecao";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import {
  comparacaoDoBenchmark,
  reaisBr,
  textoDoTempoMediano,
} from "@/lib/escale/campanhas/detalhe/apresentacao";
import type {
  ResultadoDaCampanha as Resultado,
  SituacaoDosNegocios,
} from "@/lib/escale/campanhas/detalhe/tipos";

/**
 * "RESULTADO" (011; C7–C9): negócios e valores (abrem a gaveta), custos
 * preparados com "—" (R4), tempo mediano até a resposta e o benchmark da conta
 * ("Esta campanha" em vermelho abaixo da média, em verde igual ou acima).
 */
export function ResultadoDaCampanha({
  resultado,
  aoAbrirNegocios,
}: {
  resultado: Resultado;
  aoAbrirNegocios: (situacao: SituacaoDosNegocios) => void;
}) {
  const t = useT();
  const c = comparacaoDoBenchmark(resultado);
  return (
    <>
      <TituloDaSecao>{t("Resultado")}</TituloDaSecao>
      <div className="grid grid-cols-3 gap-3">
        <CartaoDoSumario
          rotulo={t("Negócios criados")}
          dica={t("Negócios que nasceram desta campanha.")}
          valor={numeroBr(resultado.negocios)}
          tamanho="lg"
          aoClicar={() => aoAbrirNegocios("todos")}
        />
        <CartaoDoSumario
          rotulo={t("Valor em aberto")}
          dica={t("Soma dos negócios em aberto desta campanha.")}
          valor={reaisBr(resultado.valorAbertoCentavos)}
          tamanho="lg"
          aoClicar={() => aoAbrirNegocios("abertos")}
        />
        <CartaoDoSumario
          rotulo={t("Valor ganho")}
          dica={t("Soma dos negócios ganhos desta campanha.")}
          valor={reaisBr(resultado.valorGanhoCentavos)}
          tamanho="lg"
          aoClicar={() => aoAbrirNegocios("ganhos")}
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <CartaoDoSumario rotulo={t("Custo da campanha")} subtitulo={t("Custo real")} tamanho="lg" />
        <CartaoDoSumario
          rotulo={t("Custo por resposta")}
          dica={t("Custo real dividido pelas respostas.")}
          tamanho="lg"
        />
        <CartaoDoSumario
          rotulo={t("Custo por negócio")}
          dica={t("Custo real dividido pelos negócios criados.")}
          tamanho="lg"
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <CartaoDoSumario
          rotulo={t("Tempo mediano até resposta")}
          dica={t("Metade das respostas chegou antes deste tempo.")}
        >
          {resultado.medianaSegundos === null ? (
            <span className="text-[13px]">{textoDoTempoMediano(null, t)}</span>
          ) : (
            <span className="text-[18px] font-bold">
              {textoDoTempoMediano(resultado.medianaSegundos, t)}
            </span>
          )}
        </CartaoDoSumario>
        <CartaoDoSumario
          rotulo={t("Benchmark da conta")}
          dica={t("Média da taxa de resposta das 5 últimas campanhas concluídas.")}
        >
          {c.media === null ? (
            <span className="text-[13px]">
              {t("Ainda não há outras campanhas concluídas da conta para comparar.")}
            </span>
          ) : (
            <span className="block">
              <span className="block text-[18px] font-bold">{`${c.media}%`}</span>
              <span className="mt-1 block text-[11px] text-casca-suave">
                {t("Esta campanha")}{" "}
                <span
                  data-tom={c.abaixo ? "abaixo" : "acima"}
                  className={
                    c.abaixo
                      ? "font-medium text-casca-alerta"
                      : "font-medium text-(--escale-tom-verde-texto)"
                  }
                >
                  {c.estaCampanha === null ? "—" : `${c.estaCampanha}%`}
                </span>
              </span>
            </span>
          )}
        </CartaoDoSumario>
      </div>
    </>
  );
}
