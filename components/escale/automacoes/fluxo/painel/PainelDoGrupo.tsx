"use client";
import { useState } from "react";

import { ActionConfigForm, defaultActionConfig, type ActionItem } from "@/app/app/webhooks/_components/ActionConfigForm";
import { ACTION_LABELS, type ActionType } from "@/app/app/webhooks/_components/labels";
import { useT } from "@/hooks/i18n/useT";
import type { AcaoDaRegra, DadosDaAcao, DadosDaCaixa } from "@/lib/automation/desenho-da-regra";
import { acoesDoGrupo, dadosDoGrupo } from "@/lib/escale/automacoes/fluxo/grupos";
import { tituloDaAcaoNoFluxo } from "@/lib/escale/automacoes/fluxo/paleta";
import { acoesQueFechamLaco, MENSAGEM_DO_LACO_DE_LEAD } from "@/lib/schemas/webhooks";
import { Plus, Trash2 } from "@/lib/ui/icons-da-casca";

import { JanelaDeAcoes } from "../JanelaDeAcoes";
import { ICONE_DA_ACAO } from "../visual-do-fluxo";
import { PainelDoNo, ProblemasDoPainel } from "./PainelDoNo";
import { useRascunho } from "./useRascunho";

/**
 * O PAINEL DO PASSO "AÇÕES" (Clint, ao vivo): "Realizar ação:" e a lista das ações do
 * passo, cada uma com a sua configuração, e o "+ Adicionar ação" tracejado que abre o
 * modal. O painel edita um rascunho; "Salvar" o aplica no passo.
 */
export function PainelDoGrupo({
  dados,
  evento,
  aoCancelar,
  aoSalvar,
  aoMudarRascunho,
}: {
  dados: DadosDaAcao;
  evento: string;
  aoCancelar: () => void;
  aoSalvar: (dados: DadosDaCaixa) => void;
  aoMudarRascunho?: (sujo: boolean) => void;
}) {
  const t = useT();
  const { rascunho, setRascunho, sujo } = useRascunho<AcaoDaRegra[]>(acoesDoGrupo(dados), aoMudarRascunho);
  const [escolhendo, setEscolhendo] = useState(false);

  const mudar = (i: number, acao: AcaoDaRegra) => setRascunho(rascunho.map((a, j) => (j === i ? acao : a)));

  return (
    <>
      <PainelDoNo
        tipo="acoes"
        titulo={t("Ações")}
        aoCancelar={aoCancelar}
        aoSalvar={() => aoSalvar(dadosDoGrupo(rascunho))}
        salvarDesabilitado={!sujo}
      >
        <ProblemasDoPainel lista={dados.problemas} />
        <p className="mb-3 text-[13px] text-casca-texto">{t("Realizar ação:")}</p>
        <div className="flex flex-col gap-3">
          {rascunho.map((acao, i) => {
            const conhecida = acao.type in ACTION_LABELS;
            const Icone = ICONE_DA_ACAO[acao.type as ActionType];
            return (
              <div key={i} className="rounded-lg border border-casca-divisoria p-4" data-testid={`acao-do-grupo-${i}`}>
                <div className="mb-3 flex items-center gap-2">
                  {Icone ? <Icone size={16} className="shrink-0 text-casca-texto" aria-hidden /> : null}
                  <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-casca-texto">
                    {t(tituloDaAcaoNoFluxo(acao.type) ?? (conhecida ? ACTION_LABELS[acao.type as ActionType] : acao.type))}
                  </p>
                  <button
                    type="button"
                    aria-label={t("Remover ação")}
                    onClick={() => setRascunho(rascunho.filter((_, j) => j !== i))}
                    className="grid size-7 shrink-0 place-items-center rounded-md text-casca-suave hover:bg-casca-raia hover:text-casca-alerta"
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>
                {acoesQueFechamLaco(evento, [acao]).length > 0 ? (
                  <p role="alert" className="mb-3 rounded-md border border-casca-alerta/40 p-3 text-[12px] text-casca-alerta">
                    {t(MENSAGEM_DO_LACO_DE_LEAD)}
                  </p>
                ) : null}
                {conhecida ? (
                  <div data-escale-editor-de-automacao>
                    <ActionConfigForm action={acao as unknown as ActionItem} onChange={(next) => mudar(i, next as unknown as AcaoDaRegra)} />
                  </div>
                ) : (
                  <p className="text-[13px] text-casca-suave">
                    {t("Esta ação não existe nesta instalação. Exclua a caixa ou escolha outra ação.")}
                  </p>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setEscolhendo(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-casca-divisoria text-[13px] font-medium text-casca-marca-forte hover:bg-casca-raia"
          >
            <Plus size={14} aria-hidden />
            {t("Adicionar ação")}
          </button>
        </div>
      </PainelDoNo>
      <JanelaDeAcoes
        aberta={escolhendo}
        evento={evento}
        aoFechar={() => setEscolhendo(false)}
        aoEscolher={(tipo) => {
          setRascunho([...rascunho, defaultActionConfig(tipo) as unknown as AcaoDaRegra]);
          setEscolhendo(false);
        }}
      />
    </>
  );
}
