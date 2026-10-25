"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  BotaoDaJanela,
  CabecaDaJanela,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { SeletorDeDataEHora } from "@/components/escale/ui/SeletorDeDataEHora";
import { useAgendarMensagens } from "@/hooks/escale/useMensagensAgendadas";
import { useModelosDeMensagem } from "@/hooks/escale/useModelosDeMensagem";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { dataNoPassado, type MensagemAgendada } from "@/lib/escale/conversas/agendadas";
import type { ModoDoCompositor } from "@/lib/escale/conversas/janela";
import { cn } from "@/lib/utils";

const SOBRELINHA = "text-[11px] font-semibold uppercase tracking-wide text-casca-sobrelinha";
const UMA_HORA_MS = 3_600_000;

/**
 * "AGENDAR MENSAGEM" (c08; C9): 900px, duas colunas. À esquerda "Dentro da
 * janela · até 24h após resposta" (texto livre); à direita "Fora da janela"
 * (modelo aprovado). Embaixo, data e hora e Confirmar. Fora da janela, o
 * texto livre fica desligado e só o modelo vale (o cron recusa o resto).
 */
export function JanelaAgendarMensagem({
  aberta,
  aoFechar,
  conversa,
  textoInicial,
  modo,
}: {
  aberta: boolean;
  aoFechar: () => void;
  conversa: ConversationWithContact;
  textoInicial: string;
  modo: ModoDoCompositor;
}) {
  const t = useT();
  const agendar = useAgendarMensagens();
  const provider = conversa.channel_sessions?.provider ?? null;
  const { modelos, fonte } = useModelosDeMensagem(provider, aberta);
  const [texto, setTexto] = useState(textoInicial);
  const [modelo, setModelo] = useState<string>("");
  const [quando, setQuando] = useState(() => new Date(Date.now() + UMA_HORA_MS));
  const foraDaJanela = modo !== "livre";
  useEffect(() => {
    if (aberta) {
      setTexto(textoInicial);
      setModelo("");
      setQuando(new Date(Date.now() + UMA_HORA_MS));
    }
  }, [aberta, textoInicial]);

  const mensagens: MensagemAgendada[] = [];
  if (!foraDaJanela && texto.trim()) mensagens.push({ tipo: "texto", corpo: texto.trim() });
  const escolhido = modelos.find((m) => m.name === modelo);
  if (escolhido)
    mensagens.push({
      tipo: "template",
      template: {
        name: escolhido.name,
        language: escolhido.language,
        values: { ...(escolhido.savedValues ?? {}) },
      },
    });
  const passado = dataNoPassado(quando.toISOString(), new Date());
  // O modelo que exige valores e não tem `savedValues` falharia no cron, sem ninguém ver (B1-9).
  const faltamValores = !!escolhido && (escolhido.slots?.length ?? 0) > 0 && !escolhido.savedValues;
  const podeConfirmar = mensagens.length > 0 && !passado && !faltamValores && !agendar.isPending;

  const confirmar = async () => {
    if (!podeConfirmar) return;
    try {
      await agendar.mutateAsync({
        conversation_id: conversa.id,
        enviar_em: quando.toISOString(),
        mensagens,
      });
    } catch {
      return; // o aviso vem do hook; a janela fica aberta
    }
    toast.success(t("Mensagem agendada."));
    aoFechar();
  };

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[900px]">
      <CabecaDaJanela titulo={t("Agendar mensagem")} />
      <div className="mt-4 grid grid-cols-2 gap-6">
        <section className={cn("flex flex-col gap-2 pr-6", foraDaJanela && "opacity-60")}>
          <div className={SOBRELINHA}>
            {t("Dentro da janela")} · {t("até 24h após resposta")}
          </div>
          <div className="text-[13px] font-medium text-casca-texto">{t("Mensagem livre")}</div>
          <p className="text-[12px] text-casca-suave">
            {t(
              "Texto, mídia ou áudio — qualquer formato. Enviada se o lead respondeu nas últimas 24h.",
            )}
          </p>
          <textarea
            aria-label={t("Mensagem livre")}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={foraDaJanela}
            placeholder={t("Escreva uma mensagem, você pode usar variáveis")}
            className="h-40 w-full resize-none rounded-casca-gatilho border border-casca-borda bg-casca-busca p-3 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta disabled:cursor-not-allowed"
          />
          {foraDaJanela ? (
            <p className="text-[11px] text-casca-alerta">
              {t("Fora da janela de 24h")}: {t("só modelos aprovados são enviados.")}
            </p>
          ) : null}
        </section>
        <section className="flex flex-col gap-2 border-l border-casca-borda pl-6">
          <div className={SOBRELINHA}>
            {t("Fora da janela")} · {t("modelo aprovado")}
          </div>
          <div className="text-[13px] font-medium text-casca-texto">{t("Modelo de mensagem")}</div>
          <p className="text-[12px] text-casca-suave">
            {t(
              "Enviado quando o lead não respondeu nas últimas 24h. Só modelos aprovados pela Meta.",
            )}
          </p>
          {fonte === null ? (
            <p className="text-[12px] text-casca-suave">
              {t("Este dispositivo não envia modelos.")}
            </p>
          ) : (
            <SeletorDaCasca
              aparencia="janela"
              valor={modelo}
              vazio={t("Selecionar modelo")}
              opcoes={modelos.map((m) => ({ valor: m.name, rotulo: m.name }))}
              aoMudar={setModelo}
              aria-label={t("Modelo de mensagem")}
            />
          )}
          {faltamValores ? (
            <p className="text-[11px] text-casca-alerta">
              {t("Este modelo exige valores. Preencha-os em Modelos de mensagem antes de agendar.")}
            </p>
          ) : null}
        </section>
      </div>
      <div className="mt-6 flex items-end gap-4 border-t border-casca-borda pt-4">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-casca-texto">
            {t("Data e hora do envio")}
          </span>
          <SeletorDeDataEHora valor={quando} aoMudar={setQuando} />
          {passado ? (
            <span className="text-[11px] text-casca-alerta">
              {t("Não é possível agendar para uma data/hora no passado")}
            </span>
          ) : null}
        </div>
        <span className="flex-1" />
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={aoFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" disabled={!podeConfirmar} onClick={() => void confirmar()}>
          {t("Confirmar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
