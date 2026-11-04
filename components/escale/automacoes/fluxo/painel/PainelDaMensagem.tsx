"use client";
import { useMemo } from "react";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useT } from "@/hooks/i18n/useT";
import { fraseDoFluxo } from "@/lib/escale/automacoes/fluxo/frases";
import type { DadosDaAcao, DadosDaCaixa } from "@/lib/automation/desenho-da-regra";
import type { TempoDeResposta as Tempo } from "@/lib/escale/automacoes/fluxo/caixas";
import {
  configDosItens,
  itensDaConfig,
  problemaDaSequencia,
  type ItemDaSequencia,
} from "@/lib/escale/automacoes/fluxo/sequencia";

import { ListaDeItens } from "./mensagem/ListaDeItens";
import { TempoDeResposta } from "./mensagem/TempoDeResposta";
import { PainelDoNo, ProblemasDoPainel } from "./PainelDoNo";
import { useRascunho } from "./useRascunho";

type Estado = { canal: string; itens: ItemDaSequencia[]; tempo: Tempo };

/**
 * O PAINEL DA MENSAGEM DE WHATSAPP (07-027; D12): o dispositivo, a sequência (texto com botões, áudio ou arquivo, pausa
 * curta) e "Se o contato não responder em". Os blocos "Fora da janela / Dentro da janela" e os modelos da Meta não
 * entram: o motor respeita a janela, o horário comercial e o limite do número.
 */
export function PainelDaMensagem({
  dados,
  aoCancelar,
  aoSalvar,
  aoMudarRascunho,
}: {
  dados: DadosDaAcao;
  aoCancelar: () => void;
  aoSalvar: (dados: DadosDaCaixa) => void;
  aoMudarRascunho?: (sujo: boolean) => void;
}) {
  const t = useT();
  const inicial = useMemo<Estado>(
    () => ({
      canal: typeof dados.acao.config.channel_session_id === "string" ? dados.acao.config.channel_session_id : "",
      itens: itensDaConfig(dados.acao.config),
      tempo: (dados.acao.config.tempo_de_resposta as Tempo | undefined) ?? null,
    }),
    // O rascunho nasce UMA vez por painel (a tela remonta o painel por `key`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const { rascunho, setRascunho, sujo } = useRascunho<Estado>(inicial, aoMudarRascunho);
  const { data: sessoes } = useChannelSessions();
  const lista = sessoes ?? [];
  const problema = problemaDaSequencia(rascunho.itens, rascunho.tempo);

  function salvar() {
    const config = configDosItens({ ...dados.acao.config, channel_session_id: rascunho.canal }, rascunho.itens, rascunho.tempo);
    aoSalvar({ kind: "acao", acao: { type: dados.acao.type, config } });
  }

  return (
    <PainelDoNo tipo="whatsapp" titulo={t("Enviar mensagem")} aoCancelar={aoCancelar} aoSalvar={salvar} salvarDesabilitado={!sujo || problema !== null}>
      <ProblemasDoPainel lista={dados.problemas} />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-casca-texto">
            {t("Selecione o dispositivo WhatsApp")}
            <AjudaDaCasca texto={t("O número que envia a mensagem.")} />
          </p>
          <SeletorDaCasca
            aria-label={t("Número de WhatsApp")}
            aparencia="janela"
            valor={rascunho.canal}
            vazio={t("Escolha o número")}
            aoMudar={(v) => setRascunho({ ...rascunho, canal: v })}
            opcoes={[
              // O número pelo qual a conversa acontece (uma automação, N canais).
              { valor: "conversation", rotulo: t("Canal da conversa") },
              ...lista.map((s) => ({
                valor: s.id,
                rotulo: channelLabel(s, t) + (s.status !== "WORKING" ? ` — ${t("desconectado")}` : ""),
                desabilitada: s.status !== "WORKING",
              })),
            ]}
          />
          {lista.some((s) => s.status !== "WORKING") ? (
            <p className="text-[12px] text-casca-suave">
              {t("Números desconectados aparecem desabilitados — reconecte em Conexões antes de usar.")}
            </p>
          ) : null}
        </div>
        <hr className="border-casca-divisoria" />
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-casca-texto">
            {t("Configure sua mensagem")}
            <AjudaDaCasca texto={t("A mensagem respeita a janela de envio e o limite diário do número, em Conexões.")} />
          </p>
          <ListaDeItens itens={rascunho.itens} aoMudar={(itens) => setRascunho({ ...rascunho, itens })} />
          {sujo && problema ? (
            <p role="alert" className="text-[12px] text-casca-alerta">
              {fraseDoFluxo(problema, t)}
            </p>
          ) : null}
          <p className="text-[12px] text-casca-suave">
            {t("Respeitamos a janela de envio e o limite diário configurados para esse número em Conexões — fora da janela, a mensagem espera a próxima.")}
          </p>
        </div>
        <hr className="border-casca-divisoria" />
        <TempoDeResposta tempo={rascunho.tempo} aoMudar={(tempo) => setRascunho({ ...rascunho, tempo })} />
      </div>
    </PainelDoNo>
  );
}
