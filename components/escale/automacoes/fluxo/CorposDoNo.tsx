"use client";

import { DescricaoDaAcao } from "@/app/app/webhooks/automacoes/[id]/_components/CaixaDaAutomacao";
import { CURATED_FIELDS, OP_LABELS, type Op } from "@/app/app/webhooks/_components/RuleEditor";
import { ACTION_LABELS, type ActionType, type TriggerEvent } from "@/app/app/webhooks/_components/labels";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useT } from "@/hooks/i18n/useT";
import { usePipelineStages, usePipelines, useWebhookSources } from "@/hooks/webhooks/useWebhookSources";
import type { DadosDaAcao, DadosDasCondicoes, DadosDoGatilho } from "@/lib/automation/desenho-da-regra";
import { GATILHO_DE_DATA_DO_FUNIL } from "@/lib/automation/gatilho-de-data-do-funil";
import { GATILHO_ETAPA_PARADA, GATILHO_SILENCIO } from "@/lib/automation/gatilhos-de-tempo";
import { opcaoDoEvento } from "@/lib/escale/automacoes/fluxo/gatilhos";
import { acoesDoGrupo } from "@/lib/escale/automacoes/fluxo/grupos";
import { tituloDaAcaoNoFluxo } from "@/lib/escale/automacoes/fluxo/paleta";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";

import { ICONE_DA_ACAO, ICONE_DO_GATILHO } from "./visual-do-fluxo";

/**
 * FORK ESCALE · Fase 5B: o miolo de cada tipo de nó (07-013, 07-025, 07-027).
 * Só mostra; quem edita é o painel.
 */

/** O detalhe do gatilho: fonte do formulário, "campo · N = dias" ou "N = dias". Sem detalhe, sem chip. */
function useDetalheDoGatilho(dados: DadosDoGatilho): string {
  const t = useT();
  const { data: fontes } = useWebhookSources();
  const { data: funis } = usePipelines();
  const { evento, tela } = dados;
  if (evento === "lead.created") {
    const fonte = fontes?.data?.find((f) => f.id === tela.fonte);
    return tela.fonte ? (fonte ? fonte.name : t("Fonte removida")) : t("Qualquer fonte");
  }
  if (evento === GATILHO_DE_DATA_DO_FUNIL) {
    const funil = funis?.data?.find((p) => p.id === tela.data.pipeline_id);
    const campo = funil ? camposDoFunil(funil.settings ?? null).find((c) => c.key === tela.data.campo) : undefined;
    return campo ? `${campo.label} · N = ${tela.data.dias}` : t("Escolha o funil e o campo de data");
  }
  if (evento === GATILHO_SILENCIO || evento === GATILHO_ETAPA_PARADA) return `N = ${tela.tempo.dias}`;
  return "";
}

/** O chip do detalhe do gatilho; sem detalhe, nada. */
export function DetalheDoGatilho({ dados }: { dados: DadosDoGatilho }) {
  const detalhe = useDetalheDoGatilho(dados);
  if (!detalhe) return null;
  return (
    <span className="w-fit rounded-md bg-casca-raia px-2 py-0.5 text-[12px] text-casca-texto-2" data-testid="detalhe-do-gatilho">
      {detalhe}
    </span>
  );
}

export function CorpoDoGatilho({ dados }: { dados: DadosDoGatilho }) {
  const t = useT();
  const opcao = opcaoDoEvento(dados.evento);
  if (!opcao) {
    return <p className="text-[12px] text-casca-suave">{t("Escolha o gatilho que dará início à automação")}</p>;
  }
  const Icone = ICONE_DO_GATILHO[opcao.icone];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icone size={13} className="shrink-0 text-casca-suave" aria-hidden />
        <span className="text-[11px] font-semibold tracking-wide text-casca-texto-2 uppercase">{t(opcao.titulo)}</span>
        <span className="flex-1 border-t border-casca-divisoria" aria-hidden />
      </div>
      <DetalheDoGatilho dados={dados} />
    </div>
  );
}

export function CorpoDasCondicoes({ dados, evento }: { dados: DadosDasCondicoes; evento: string }) {
  const t = useT();
  const { data: funis } = usePipelines();
  const padrao = funis?.data?.find((p) => p.is_default) ?? funis?.data?.[0] ?? null;
  const { data: quadro } = usePipelineStages(padrao?.id ?? null);
  const completas = dados.linhas.filter((l) => l.field.trim() && l.value.trim());
  const campos = CURATED_FIELDS[evento as TriggerEvent] ?? [];
  return (
    <div className="flex flex-col gap-2 text-[13px] text-casca-texto">
      <p>
        {t("Corresponde a")} <strong>{t("todas")}</strong> {t("as condições")}
      </p>
      {completas.length === 0 ? (
        <p className="text-[12px] text-casca-suave">{t("Nenhuma condição completa: roda em todo evento")}</p>
      ) : (
        completas.map((l, i) => {
          const campo = campos.find((c) => c.value === l.field);
          const op = t(campo?.lista && l.op === "contains" ? "tem a tag" : OP_LABELS[l.op as Op]);
          const valor =
            campo?.kind === "stage" ? (quadro?.data?.stages.find((s) => s.id === l.value)?.name ?? l.value) : l.value;
          return (
            <div key={i} className="rounded-lg bg-casca-raia px-3 py-2" data-testid="condicao-do-no">
              <p>
                {campo ? t(campo.label) : l.field} <u className="font-semibold">{op}</u>
              </p>
              <p className="text-[12px] text-casca-texto-2">{valor}</p>
            </div>
          );
        })
      )}
      <p className="text-[12px] text-casca-suave">{t("Se não corresponder, a automação para aqui.")}</p>
    </div>
  );
}

export function CorpoDoWhatsapp({ dados }: { dados: DadosDaAcao }) {
  const t = useT();
  const { data: sessoes } = useChannelSessions();
  const config = dados.acao.config;
  const sessao = (sessoes ?? []).find((s) => s.id === config.channel_session_id);
  const texto = typeof config.template === "string" ? config.template.trim() : "";
  return (
    <div className="flex flex-col gap-2">
      <span className="w-fit rounded-md bg-casca-raia px-2 py-0.5 text-[12px] text-casca-texto-2">
        {config.channel_session_id === "conversation"
          ? t("Canal da conversa")
          : sessao
            ? channelLabel(sessao, t)
            : t("Dispositivo não configurado")}
      </span>
      <p className="line-clamp-4 rounded-lg border border-casca-divisoria px-3 py-2 text-[12px] whitespace-pre-wrap text-casca-texto">
        {texto || t("Escreva a mensagem")}
      </p>
    </div>
  );
}

export function CorpoDaAcao({ dados }: { dados: DadosDaAcao }) {
  const t = useT();
  const { acao } = dados;
  if (acao.type === "ai_decide") {
    const opcoes = Array.isArray(acao.config.opcoes)
      ? (acao.config.opcoes as Array<{ rotulo?: unknown; acao?: { type?: unknown } | null }>)
      : [];
    return (
      <div className="flex flex-col gap-1 text-[12px] text-casca-texto-2">
        <p>{t("Hoje este passo só se edita pela API")}</p>
        <ul>
          {opcoes.map((o, i) => (
            <li key={i} className="line-clamp-2 break-words">
              {`${typeof o.rotulo === "string" ? o.rotulo : "—"} → ${
                typeof o.acao?.type === "string" ? t(ACTION_LABELS[o.acao.type as ActionType] ?? o.acao.type) : "—"
              }`}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <p className="line-clamp-3 break-words text-[12px] text-casca-texto-2">
      <DescricaoDaAcao tipo={acao.type} config={acao.config} />
    </p>
  );
}

/**
 * O corpo do passo "Ações" (Clint, ao vivo): a lista das ações do passo, cada uma com o
 * título e o resumo; vazio, o "+ Adicionar ação" tracejado (o painel é que adiciona).
 */
export function CorpoDoGrupo({ dados }: { dados: DadosDaAcao }) {
  const t = useT();
  const acoes = acoesDoGrupo(dados);
  if (acoes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-casca-divisoria py-3 text-center text-[13px] font-medium text-casca-marca-forte">
        + {t("Adicionar ação")}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2" data-testid="acoes-do-no">
      {acoes.map((acao, i) => {
        const Icone = ICONE_DA_ACAO[acao.type as ActionType];
        return (
          <li key={i} className="flex items-start gap-2 rounded-lg border border-casca-divisoria px-3 py-2">
            {Icone ? <Icone size={14} className="mt-0.5 shrink-0 text-casca-texto" aria-hidden /> : null}
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-casca-texto">
                {t(tituloDaAcaoNoFluxo(acao.type) ?? ACTION_LABELS[acao.type as ActionType] ?? acao.type)}
              </span>
              <span className="line-clamp-2 block break-words text-[12px] text-casca-texto-2">
                <DescricaoDaAcao tipo={acao.type} config={acao.config} />
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
