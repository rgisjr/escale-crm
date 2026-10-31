"use client";

import { ActionConfigForm, type ActionItem } from "@/app/app/webhooks/_components/ActionConfigForm";
import { ACTION_LABELS, type ActionType } from "@/app/app/webhooks/_components/labels";
import { useT } from "@/hooks/i18n/useT";
import type { AcaoDaRegra, DadosDaAcao, DadosDaCaixa } from "@/lib/automation/desenho-da-regra";
import { tipoDoNo, tituloDaAcaoNoFluxo } from "@/lib/escale/automacoes/fluxo/paleta";
import { acoesQueFechamLaco, MENSAGEM_DO_LACO_DE_LEAD } from "@/lib/schemas/webhooks";

import { PainelDoNo, ProblemasDoPainel } from "./PainelDoNo";
import { useRascunho } from "./useRascunho";

/**
 * O PAINEL DAS OUTRAS AÇÕES (D12): as ações sem painel próprio usam o
 * `ActionConfigForm` do original, vestido pela marca `data-escale-editor-de-automacao`
 * (5A). "A IA decide" só se lê: hoje ele só se edita pela API.
 */
export function PainelDaAcao({
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
  const { rascunho, setRascunho, sujo } = useRascunho<AcaoDaRegra>(dados.acao, aoMudarRascunho);
  const tipo = tipoDoNo(dados);

  if (dados.acao.type === "ai_decide") {
    const acao = dados.acao;
    const opcoes = Array.isArray(acao.config.opcoes)
      ? (acao.config.opcoes as Array<{ rotulo?: unknown; acao?: { type?: unknown } | null }>)
      : [];
    return (
      <PainelDoNo tipo={tipo} titulo={t("A IA decide")} comRodape={false} aoCancelar={aoCancelar} aoSalvar={aoCancelar}>
        <ProblemasDoPainel lista={dados.problemas} />
        <div className="flex flex-col gap-3">
          <p className="rounded-md border border-casca-divisoria p-3 text-[13px] text-casca-texto-2">
            {t(
              "Este passo foi criado pela API e hoje não tem tela de edição. O designer mostra, mantém a posição dele na fila e grava de volta sem mudar nada.",
            )}
          </p>
          {typeof acao.config.instrucao === "string" ? (
            <div>
              <p className="text-[12px] font-medium text-casca-texto">{t("Instrução para a IA")}</p>
              <p className="text-[13px] break-words whitespace-pre-wrap text-casca-texto">{acao.config.instrucao}</p>
            </div>
          ) : null}
          <ul className="flex flex-col gap-1 text-[13px]">
            {opcoes.map((o, i) => (
              <li key={i} className="rounded-md border border-casca-divisoria px-3 py-2">
                <span className="font-medium text-casca-texto">{typeof o.rotulo === "string" ? o.rotulo : "—"}</span>
                <span className="text-casca-suave">
                  {` → ${typeof o.acao?.type === "string" ? t(ACTION_LABELS[o.acao.type as ActionType] ?? o.acao.type) : "—"}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </PainelDoNo>
    );
  }

  const conhecida = rascunho.type in ACTION_LABELS;
  const titulo = t(tituloDaAcaoNoFluxo(rascunho.type) ?? (conhecida ? ACTION_LABELS[rascunho.type as ActionType] : rascunho.type));
  return (
    <PainelDoNo
      tipo={tipo}
      titulo={titulo}
      aoCancelar={aoCancelar}
      aoSalvar={() => aoSalvar({ kind: "acao", acao: rascunho })}
      salvarDesabilitado={!sujo || !conhecida}
    >
      <ProblemasDoPainel lista={dados.problemas} />
      {acoesQueFechamLaco(evento, [rascunho]).length > 0 ? (
        <p role="alert" className="mb-4 rounded-md border border-casca-alerta/40 p-3 text-[12px] text-casca-alerta">
          {t(MENSAGEM_DO_LACO_DE_LEAD)}
        </p>
      ) : null}
      {conhecida ? (
        <div data-escale-editor-de-automacao>
          <ActionConfigForm
            action={rascunho as unknown as ActionItem}
            onChange={(next) => setRascunho(next as unknown as AcaoDaRegra)}
          />
        </div>
      ) : (
        <p className="text-[13px] text-casca-suave">
          {t("Esta ação não existe nesta instalação. Exclua a caixa ou escolha outra ação.")}
        </p>
      )}
    </PainelDoNo>
  );
}
