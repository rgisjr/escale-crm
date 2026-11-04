"use client";

import { DescricaoDaAcao } from "@/app/app/webhooks/automacoes/[id]/_components/CaixaDaAutomacao";
import { CURATED_FIELDS, OP_LABELS, type Op } from "@/app/app/webhooks/_components/RuleEditor";
import { ACTION_LABELS, type ActionType, type TriggerEvent } from "@/app/app/webhooks/_components/labels";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useT } from "@/hooks/i18n/useT";
import { usePipelineStages, usePipelines, useWebhookSources } from "@/hooks/webhooks/useWebhookSources";
import type { DadosDaAcao, DadosDasCondicoes, DadosDoGatilho } from "@/lib/automation/desenho-da-regra";
import { ehCampoDeHorario } from "@/lib/automation/condicoes-de-horario";
import { ehGatilhoDeTag } from "@/lib/automation/filtro-do-gatilho";
import { GATILHO_DE_DATA_DO_FUNIL } from "@/lib/automation/gatilho-de-data-do-funil";
import { GATILHO_ETAPA_PARADA, GATILHO_SILENCIO } from "@/lib/automation/gatilhos-de-tempo";
import type { DadosDoAtraso } from "@/lib/escale/automacoes/fluxo/caixas";
import { SIGLA_DO_DIA, resumoDoHorario, textoDoResumoDoHorario } from "@/lib/escale/automacoes/fluxo/condicoes";
import { opcaoDoEvento } from "@/lib/escale/automacoes/fluxo/gatilhos";
import { acoesDoGrupo } from "@/lib/escale/automacoes/fluxo/grupos";
import { itensDaConfig } from "@/lib/escale/automacoes/fluxo/sequencia";
import { tituloDaAcaoNoFluxo } from "@/lib/escale/automacoes/fluxo/paleta";
import { GATILHO_DE_COMENTARIO, GATILHOS_DE_DIRECT } from "@/lib/escale/comentarios/constantes";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import { GATILHO_DE_MENSAGEM_ENVIADA, resumoDaMensagemEnviada } from "@/lib/automation/mensagem-enviada";

import { LinhaDeSaida } from "./LinhaDeSaida";
import { CorpoDoComentario } from "./comentario/CorpoDoComentario";
import { CorpoDoDirect } from "./comentario/CorpoDoDirect";
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
  // FORK ESCALE · automações: a etapa do "Negócio criado" (o hook roda sempre; sem origem, não busca).
  const { data: quadroDoCriado } = usePipelineStages(evento === "lead.created" && tela.criado.pipeline_id ? tela.criado.pipeline_id : null);
  if (evento === "lead.created") {
    const funil = funis?.data?.find((p) => p.id === tela.criado.pipeline_id);
    const partes = [tela.criado.pipeline_id ? (funil?.name ?? t("Origem removida")) : t("Qualquer origem")];
    if (tela.criado.stage_id) {
      partes.push(quadroDoCriado?.data?.stages.find((s) => s.id === tela.criado.stage_id)?.name ?? t("Etapa removida"));
    }
    if (tela.fonte) {
      const fonte = fontes?.data?.find((f) => f.id === tela.fonte);
      partes.push(fonte ? fonte.name : t("Fonte removida"));
    }
    return partes.join(" · ");
  }
  if (ehGatilhoDeTag(evento)) return tela.tags.length > 0 ? tela.tags.join(", ") : t("Qualquer tag");
  if (evento === GATILHO_DE_MENSAGEM_ENVIADA) return resumoDaMensagemEnviada(tela.configPropria, t);
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
      {/* FORK ESCALE · Fase 10B: o gatilho de comentário mostra a conta e os caminhos. */}
      {dados.evento === GATILHO_DE_COMENTARIO ? (
        <CorpoDoComentario dados={dados} />
      ) : (GATILHOS_DE_DIRECT as readonly string[]).includes(dados.evento) ? (
        <CorpoDoDirect dados={dados} />
      ) : (
        <DetalheDoGatilho dados={dados} />
      )}
    </div>
  );
}

/** As linhas de um grupo de condições (ou da lista de sempre): cada uma num bloco cinza, "Horário atual" com a frase da Clint. */
function LinhasResumidas({
  linhas,
  campos,
  etapas,
}: {
  linhas: DadosDasCondicoes["linhas"];
  campos: ReturnType<() => (typeof CURATED_FIELDS)[TriggerEvent]>;
  etapas: Array<{ id: string; name: string }>;
}) {
  const t = useT();
  return linhas.map((l, i) => {
    if (ehCampoDeHorario(l.field)) {
      // FORK ESCALE · automações: "Horário atual" com a frase e o intervalo da Clint.
      const resumo = resumoDoHorario(l);
      return (
        <div key={i} className="rounded-lg bg-casca-raia px-3 py-2" data-testid="condicao-do-no">
          <p>
            {t("Horário atual")} <u className="font-semibold">{resumo ? t(resumo.frase) : t("Revise o horário da condição.")}</u>
          </p>
          {resumo ? <p className="text-[12px] text-casca-texto-2">{textoDoResumoDoHorario(l.field, resumo, t)}</p> : null}
        </div>
      );
    }
    const campo = campos.find((c) => c.value === l.field);
    const op = t(campo?.lista && l.op === "contains" ? "tem a tag" : OP_LABELS[l.op as Op]);
    const valor = campo?.kind === "stage" ? (etapas.find((s) => s.id === l.value)?.name ?? l.value) : l.value;
    return (
      <div key={i} className="rounded-lg bg-casca-raia px-3 py-2" data-testid="condicao-do-no">
        <p>
          {campo ? t(campo.label) : l.field} <u className="font-semibold">{op}</u>
        </p>
        <p className="text-[12px] text-casca-texto-2">{valor}</p>
      </div>
    );
  });
}

export function CorpoDasCondicoes({ dados, evento }: { dados: DadosDasCondicoes; evento: string }) {
  const t = useT();
  const { data: funis } = usePipelines();
  const padrao = funis?.data?.find((p) => p.is_default) ?? funis?.data?.[0] ?? null;
  const { data: quadro } = usePipelineStages(padrao?.id ?? null);
  const etapas = quadro?.data?.stages ?? [];
  const campos = CURATED_FIELDS[evento as TriggerEvent] ?? [];
  const completas = (linhas: DadosDasCondicoes["linhas"]) => linhas.filter((l) => l.field.trim() && l.value.trim());
  // FORK ESCALE · 5D: com grupos, cada grupo é um bloco com a sua saída (07-025, 07-026).
  if (dados.grupos) {
    return (
      <div className="flex flex-col gap-3 text-[13px] text-casca-texto" data-testid="grupos-do-no">
        {dados.grupos.map((g) => (
          <LinhaDeSaida key={g.id} saida={`grupo:${g.id}`} dentro className="flex flex-col gap-2">
            <p>
              {t("Corresponde a")} <strong>{g.modo === "qualquer" ? t("qualquer condição") : t("todas as condições")}</strong>
            </p>
            {completas(g.linhas).length === 0 ? (
              <p className="text-[12px] text-casca-suave">{t("Nenhuma condição completa: roda em todo evento")}</p>
            ) : (
              <LinhasResumidas linhas={completas(g.linhas)} campos={campos} etapas={etapas} />
            )}
          </LinhaDeSaida>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 text-[13px] text-casca-texto">
      <p>
        {t("Corresponde a")} <strong>{t("todas")}</strong> {t("as condições")}
      </p>
      {completas(dados.linhas).length === 0 ? (
        <p className="text-[12px] text-casca-suave">{t("Nenhuma condição completa: roda em todo evento")}</p>
      ) : (
        <LinhasResumidas linhas={completas(dados.linhas)} campos={campos} etapas={etapas} />
      )}
      <p className="text-[12px] text-casca-suave">{t("Se não corresponder, a automação para aqui.")}</p>
    </div>
  );
}

/** "seg a sex", "todos os dias" ou as siglas separadas por vírgula. */
function diasEmTexto(dias: readonly number[], t: (s: string) => string): string {
  const ordem = [...new Set(dias)].sort((a, b) => a - b);
  if (ordem.length === 7) return t("todos os dias");
  if (ordem.join() === "1,2,3,4,5") return `${t(SIGLA_DO_DIA[1])} ${t("a")} ${t(SIGLA_DO_DIA[5])}`;
  return [...ordem.filter((d) => d !== 0), ...ordem.filter((d) => d === 0)].map((d) => t(SIGLA_DO_DIA[d]!)).join(", ");
}

/** O corpo do Atraso (07-026): "Aguardar 3 minutos" e, com janela, "Continuar entre 08:00 e 19:00 · seg a sex". */
export function CorpoDoAtraso({ dados }: { dados: DadosDoAtraso }) {
  const t = useT();
  const umaSo = dados.quantidade === 1;
  const unidade = {
    segundos: umaSo ? t("segundo") : t("segundos"),
    minutos: umaSo ? t("minuto") : t("minutos"),
    horas: umaSo ? t("hora") : t("horas"),
    dias: umaSo ? t("dia") : t("dias"),
  }[dados.unidade];
  return (
    <div className="flex flex-col gap-1 text-[13px] text-casca-texto" data-testid="corpo-do-atraso">
      <p>{`${t("Aguardar")} ${dados.quantidade} ${unidade}`}</p>
      {dados.janela ? (
        <p className="text-[12px] text-casca-texto-2">
          {`${t("Continuar entre")} ${dados.janela.de} ${t("e")} ${dados.janela.ate} · ${diasEmTexto(dados.janela.dias, t)}`}
        </p>
      ) : null}
    </div>
  );
}

export function CorpoDoWhatsapp({ dados }: { dados: DadosDaAcao }) {
  const t = useT();
  const { data: sessoes } = useChannelSessions();
  const config = dados.acao.config;
  const sessao = (sessoes ?? []).find((s) => s.id === config.channel_session_id);
  // FORK ESCALE · 5D: a mensagem em sequência (texto com botões, arquivo, pausa); um texto só é o `template` de sempre.
  const itens = itensDaConfig(config);
  const ultimoTexto = itens.reduce((u, item, i) => (item.tipo === "texto" ? i : u), -1);
  return (
    <div className="flex flex-col gap-2">
      <span className="w-fit rounded-md bg-casca-raia px-2 py-0.5 text-[12px] text-casca-texto-2">
        {config.channel_session_id === "conversation"
          ? t("Canal da conversa")
          : sessao
            ? channelLabel(sessao, t)
            : t("Dispositivo não configurado")}
      </span>
      {itens.map((item, i) =>
        item.tipo === "texto" ? (
          <div key={item.chave} className="flex flex-col gap-1.5">
            <p className="line-clamp-4 rounded-lg border border-casca-divisoria px-3 py-2 text-[12px] whitespace-pre-wrap text-casca-texto">
              {item.texto.trim() || t("Escreva a mensagem")}
            </p>
            {i === ultimoTexto
              ? item.botoes.map((b) => (
                  <LinhaDeSaida
                    key={b.id}
                    saida={`botao:${b.id}`}
                    dentro
                    className="rounded-lg border border-casca-divisoria bg-casca-raia px-3 py-1.5 text-[12px] text-casca-texto"
                  >
                    {b.titulo || t("Botão")}
                  </LinhaDeSaida>
                ))
              : null}
          </div>
        ) : item.tipo === "midia" ? (
          <p key={item.chave} className="rounded-lg border border-casca-divisoria px-3 py-2 text-[12px] text-casca-texto-2">
            {item.asset.startsWith("var:") ? `${t("Áudio do número")}: ${item.asset.slice(4)}` : t("Áudio ou arquivo")}
          </p>
        ) : (
          <p key={item.chave} className="text-center text-[12px] text-casca-suave">
            {`${t("Aguardar")} ${item.segundos} ${t("segundos")}`}
          </p>
        ),
      )}
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
