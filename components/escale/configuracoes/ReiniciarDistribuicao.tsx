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
 * O RESET DA DISTRIBUIÇÃO (fork Escale, Fase 1K; código `us` da Clint). Editando e
 * válido: a caixa "Reiniciar a contagem de negócios ao salvar" (vai no rascunho).
 * Senão: "Resetar distribuição", que é imediato depois do "Sim". Na Clint mora no
 * rodapé da janela; aqui fica logo abaixo da tabela, onde se vê (pedido do usuário,
 * 18/10). Sem ninguém na distribuição gravada não há contagem a zerar: nada aparece.
 */
export function ReiniciarDistribuicao({ config, rascunho, mudar }: PropsDaSecao) {
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

  if (config.distribuicao.length === 0) return null;

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
        className="inline-flex h-8 w-fit items-center gap-2 rounded-[6px] border border-casca-borda px-3 text-[13px] text-casca-texto hover:bg-casca-raia disabled:opacity-60"
      >
        <Undo2 size={16} aria-hidden />
        {t("Resetar distribuição")}
      </button>
    </ConfirmacaoDaCasca>
  );
}
