"use client";

import { Campo } from "@/components/escale/origens/JanelaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useT } from "@/hooks/i18n/useT";
import { MAXIMO_DA_PALAVRA_ENVIADA, type ConfigDaMensagemEnviada } from "@/lib/automation/mensagem-enviada";
import { cn } from "@/lib/utils";

import { FiltroDePalavras } from "../comentario/FiltroDePalavras";

/** O seletor não guarda "" como opção: "qualquer" na tela, "" na configuração. */
const QUALQUER_NUMERO = "qualquer";

/**
 * O PAINEL DO GATILHO "EQUIPE ENVIA UMA MENSAGEM" (fork Escale; paridade com o "Mensagem enviada" do
 * Datacrazy, captura de 04/11/2026). A Clint não tem este gatilho: o molde é o painel dos gatilhos de
 * direct (Fase 10D) — número, filtro de mensagem e as duas opções do Datacrazy.
 */
export function FormularioDaMensagemEnviada({
  config,
  aoMudar,
}: {
  config: ConfigDaMensagemEnviada;
  aoMudar: (config: ConfigDaMensagemEnviada) => void;
}) {
  const t = useT();
  const { data: sessoes } = useChannelSessions();
  const lista = sessoes ?? [];
  const { filtro } = config;

  return (
    <div className="flex flex-col gap-5">
      <Campo rotulo={t("Número que monitora as mensagens enviadas")}>
        <SeletorDaCasca
          aria-label={t("Número que monitora as mensagens enviadas")}
          aparencia="janela"
          valor={config.channel_session_id || QUALQUER_NUMERO}
          aoMudar={(v) => aoMudar({ ...config, channel_session_id: !v || v === QUALQUER_NUMERO ? "" : v })}
          opcoes={[
            { valor: QUALQUER_NUMERO, rotulo: t("Qualquer número") },
            ...lista.map((s) => ({ valor: s.id, rotulo: channelLabel(s, t) })),
          ]}
        />
      </Campo>
      <hr className="border-casca-divisoria" />
      <div className="flex flex-col gap-2">
        <p className="text-[12px] font-semibold text-casca-texto">{t("Filtro de mensagem")}</p>
        <div className="flex gap-2" role="group" aria-label={t("Filtro de mensagem")}>
          {(["qualquer", "palavras"] as const).map((modo) => (
            <button
              key={modo}
              type="button"
              aria-pressed={filtro.modo === modo}
              onClick={() =>
                filtro.modo !== modo &&
                aoMudar({
                  ...config,
                  filtro:
                    modo === "qualquer"
                      ? { modo: "qualquer" }
                      : { modo: "palavras", condicoes: [{ operador: "contem", valor: "" }], combinar: "qualquer" },
                })
              }
              className={cn(
                "h-8 flex-1 rounded-md border text-[12px]",
                filtro.modo === modo
                  ? "border-casca-marca bg-casca-marca-suave text-casca-texto"
                  : "border-casca-divisoria text-casca-texto-2 hover:bg-casca-raia",
              )}
            >
              {modo === "qualquer" ? t("Qualquer mensagem") : t("Com palavras")}
            </button>
          ))}
        </div>
        <FiltroDePalavras filtro={filtro} maximo={MAXIMO_DA_PALAVRA_ENVIADA} aoMudar={(f) => aoMudar({ ...config, filtro: f })} />
        {filtro.modo === "qualquer" ? (
          <p role="note" className="rounded-md border border-casca-aviso/40 p-2.5 text-[12px] text-casca-aviso">
            {t("Com \"Qualquer mensagem\", a automação roda a cada mensagem que a equipe enviar.")}
          </p>
        ) : null}
      </div>
      <hr className="border-casca-divisoria" />
      <CaixaDaCasca
        aria-label={t("Disparar também em mensagens enviadas em grupos")}
        marcada={config.em_grupos}
        aoMudar={(v) => aoMudar({ ...config, em_grupos: v })}
        rotulo={t("Disparar também em mensagens enviadas em grupos")}
      />
      <CaixaDaCasca
        aria-label={t("Considerar mensagens agendadas")}
        marcada={config.agendadas}
        aoMudar={(v) => aoMudar({ ...config, agendadas: v })}
        rotulo={t("Considerar mensagens agendadas")}
      />
      <p className="text-[12px] text-casca-suave">
        {t(
          "Dispara com mensagem enviada por uma pessoa da equipe, pelo sistema ou pelo celular. Mensagem enviada pela IA ou por outra automação não dispara.",
        )}
      </p>
    </div>
  );
}
