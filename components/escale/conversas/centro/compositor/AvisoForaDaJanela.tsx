"use client";
import { useT } from "@/hooks/i18n/useT";
import { NOME_DO_ASSISTENTE } from "@/lib/escale/conversas/assistente";
import { AlarmClock, Clock, FileText, Lightbulb, Sparkles } from "@/lib/ui/icons-da-casca";

import { BOTAO_DO_ICONE } from "./BarraDeIcones";

/**
 * O COMPOSITOR FORA DA JANELA (c56, c73; C2, C11; N16): o aviso no lugar do
 * campo. Com modelos: "Fora da janela de 24h da Meta" e o botão do modelo;
 * depois de um modelo nosso: "Enviar outro modelo de mensagem"; sem modelos
 * (Instagram): só "Aguarde a resposta do contato…".
 */
export function AvisoForaDaJanela({
  modo,
  aoAbrirModelos,
  aoAbrirAssistente,
  aoAgendar,
}: {
  modo: "so_modelo" | "outro_modelo" | "aguardando_contato";
  aoAbrirModelos: () => void;
  aoAbrirAssistente: () => void;
  aoAgendar: () => void;
}) {
  const t = useT();
  const titulo =
    modo === "so_modelo"
      ? t("Fora da janela de 24h da Meta")
      : modo === "outro_modelo"
        ? t("Enviar outro modelo de mensagem")
        : t("Janela encerrada");
  const texto =
    modo === "so_modelo"
      ? t("Você só pode enviar mensagens utilizando modelos aprovados.")
      : modo === "outro_modelo"
        ? t("Aguarde a resposta do contato ou envie outro template aprovado.")
        : t("Aguarde a resposta do contato para enviar novas mensagens.");
  return (
    <div
      className="flex items-center gap-3 border-t border-casca-borda px-4 py-3"
      data-testid="aviso-fora-da-janela"
    >
      <Clock size={16} aria-hidden className="shrink-0 text-casca-suave" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-casca-texto">{titulo}</div>
        <div className="text-[12px] text-casca-suave">{texto}</div>
      </div>
      {modo !== "aguardando_contato" ? (
        <>
          <button
            type="button"
            className={BOTAO_DO_ICONE}
            aria-label={NOME_DO_ASSISTENTE}
            title={NOME_DO_ASSISTENTE}
            onClick={aoAbrirAssistente}
          >
            <Sparkles size={16} aria-hidden />
          </button>
          <button
            type="button"
            className={BOTAO_DO_ICONE}
            aria-label={t("Sugestões")}
            title={t("Em breve")}
            disabled
          >
            <Lightbulb size={16} aria-hidden />
          </button>
          <button
            type="button"
            className={BOTAO_DO_ICONE}
            aria-label={t("Agendar mensagem")}
            title={t("Agendar mensagem")}
            onClick={aoAgendar}
          >
            <AlarmClock size={16} aria-hidden />
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-casca-gatilho bg-casca-marca px-3 text-[12px] font-medium text-white hover:opacity-90"
            onClick={aoAbrirModelos}
            aria-label={t("Enviar modelo de mensagem")}
          >
            <FileText size={14} aria-hidden />
            {t("Enviar modelo de mensagem")}
          </button>
        </>
      ) : null}
    </div>
  );
}
