"use client";
import { useRef } from "react";

import { SeletorDeVariaveis } from "@/components/escale/variaveis/SeletorDeVariaveis";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useT } from "@/hooks/i18n/useT";
import { useDefaultPipeline } from "@/hooks/pipelines/useDefaultPipeline";
import type { DadosDaAcao, DadosDaCaixa } from "@/lib/automation/desenho-da-regra";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import { Plus } from "@/lib/ui/icons-da-casca";

import { PainelDoNo, ProblemasDoPainel } from "./PainelDoNo";
import { useRascunho } from "./useRascunho";

/**
 * O PAINEL DA MENSAGEM DE WHATSAPP (07-027; D12): o dispositivo e a mensagem. Sem os
 * acordeões "Fora da janela"/"Dentro da janela", sem modelo e sem "Adicionar botão":
 * a ação manda texto livre e o motor respeita a janela e o limite do número.
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
  const { rascunho, setRascunho, sujo } = useRascunho(dados.acao, aoMudarRascunho);
  const { data: sessoes } = useChannelSessions();
  const pipeline = useDefaultPipeline(true);
  const campos = camposDoFunil(pipeline.data?.pipeline.settings ?? null).map((f) => ({ chave: f.key, rotulo: f.label }));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const config = rascunho.config;
  const canal = typeof config.channel_session_id === "string" ? config.channel_session_id : "";
  const texto = typeof config.template === "string" ? config.template : "";
  const mudar = (patch: Record<string, unknown>) => setRascunho({ ...rascunho, config: { ...config, ...patch } });

  function inserir(token: string) {
    const el = textareaRef.current;
    const inicio = el?.selectionStart ?? texto.length;
    const fim = el?.selectionEnd ?? texto.length;
    mudar({ template: texto.slice(0, inicio) + token + texto.slice(fim) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(inicio + token.length, inicio + token.length);
    });
  }

  const lista = sessoes ?? [];
  return (
    <PainelDoNo
      tipo="whatsapp"
      titulo={t("Enviar mensagem")}
      aoCancelar={aoCancelar}
      aoSalvar={() => aoSalvar({ kind: "acao", acao: rascunho })}
      salvarDesabilitado={!sujo}
    >
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
            valor={canal}
            vazio={t("Escolha o número")}
            aoMudar={(v) => mudar({ channel_session_id: v })}
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
          <div className="flex flex-col gap-2 rounded-lg border border-casca-divisoria p-4">
            <SeletorDeVariaveis
              aoEscolher={inserir}
              adicionais={{ negocio: campos }}
              gatilho={
                <button type="button" className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-casca-marca hover:underline">
                  <Plus size={14} aria-hidden />
                  {t("Adicionar variáveis")}
                </button>
              }
            />
            <textarea
              ref={textareaRef}
              rows={5}
              aria-label={t("Mensagem")}
              value={texto}
              onChange={(e) => mudar({ template: e.target.value })}
              placeholder="Oi [CONTACT.FIRST_NAME], tudo bem?"
              className="w-full resize-y rounded-[4px] border-0 bg-casca-raia p-3 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
            />
          </div>
          <p className="text-[12px] text-casca-suave">
            {t("Respeitamos a janela de envio e o limite diário configurados para esse número em Conexões — fora da janela, a mensagem espera a próxima.")}
          </p>
        </div>
      </div>
    </PainelDoNo>
  );
}
