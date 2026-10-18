"use client";
import { toast } from "sonner";

import { textoDoErro } from "@/components/escale/origens/texto-do-erro";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { ConfirmacaoDaCasca } from "@/components/escale/ui/ConfirmacaoDaCasca";
import { useReiniciarDistribuicao } from "@/hooks/escale/useDistribuicao";
import { useT } from "@/hooks/i18n/useT";
import { erroDaDistribuicao, linhasDaTela } from "@/lib/escale/distribuicao/regras";
import { Undo2 } from "@/lib/ui/icons-da-casca";

import type { PropsDaSecao } from "./JanelaDaOrigem";

/**
 * O CANTO ESQUERDO DO RODAPÉ NA DISTRIBUIÇÃO (fork Escale, Fase 1K; print 01-028
 * e código `us` da Clint). Editando e válido: a caixa "Reiniciar a contagem de
 * negócios ao salvar" (vai no rascunho). Senão: "Resetar distribuição", que é
 * imediato depois do "Sim".
 */
export function RodapeDaDistribuicao({ config, rascunho, mudar }: PropsDaSecao) {
  const t = useT();
  const reiniciar = useReiniciarDistribuicao(config.pipeline.id);
  const editando =
    JSON.stringify(rascunho.distribuicao.linhas) !==
    JSON.stringify(linhasDaTela(config.distribuicao));

  if (editando && erroDaDistribuicao(rascunho.distribuicao.linhas) === null) {
    return (
      <div className="flex items-center gap-1.5 text-[13px] text-casca-texto">
        <CaixaDaCasca
          marcada={rascunho.distribuicao.reiniciar}
          aoMudar={(marcada) =>
            mudar((r) => ({ ...r, distribuicao: { ...r.distribuicao, reiniciar: marcada } }))
          }
          rotulo={t("Reiniciar a contagem de negócios ao salvar")}
        />
        <AjudaDaCasca
          texto={t("Zera o contador e apaga o histórico de distribuições desta origem.")}
        />
      </div>
    );
  }

  return (
    <ConfirmacaoDaCasca
      texto={t(
        "A contagem de negócios será zerada e o histórico de distribuições desta origem será apagado. Tem certeza que deseja continuar?",
      )}
      aoConfirmar={() =>
        reiniciar.mutate(undefined, {
          onSuccess: () => toast.success(t("A distribuição foi reiniciada com sucesso.")),
          onError: (e) => toast.error(textoDoErro(e, t)),
        })
      }
    >
      <button
        type="button"
        disabled={reiniciar.isPending}
        title={t(
          "Zera o contador de todos os usuários, reinicia o rodízio e apaga o histórico de distribuições desta origem.",
        )}
        className="inline-flex h-8 items-center gap-2 px-2 text-[13px] text-casca-suave hover:text-casca-texto disabled:opacity-60"
      >
        <Undo2 size={16} aria-hidden />
        {t("Resetar distribuição")}
      </button>
    </ConfirmacaoDaCasca>
  );
}
