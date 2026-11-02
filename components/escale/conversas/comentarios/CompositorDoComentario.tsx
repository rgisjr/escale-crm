"use client";
import { useState } from "react";

import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { EXPLICACAO_DO_DIRECT, type ComentarioDaCaixa } from "@/lib/escale/comentarios/caixa";
import { MAXIMO_DO_TEXTO_A_MAO } from "@/lib/escale/comentarios/constantes";
import { Info, Send, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export type ModoDoCompositor = "responder" | "direct";

/**
 * FORK ESCALE · Fase 10A (4.5): o compositor da caixa — "Responder em público" / "Mandar direct" para o
 * comentário escolhido. `aoEnviar` rejeita quando falha: o texto fica para tentar de novo.
 */
export function CompositorDoComentario({
  alvo,
  modo,
  aoMudarModo,
  aoCancelar,
  aoEnviar,
}: {
  alvo: ComentarioDaCaixa | null;
  modo: ModoDoCompositor;
  aoMudarModo: (m: ModoDoCompositor) => void;
  aoCancelar: () => void;
  aoEnviar: (modo: ModoDoCompositor, texto: string) => Promise<void>;
}) {
  const t = useT();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const directBloqueado = modo === "direct" && alvo !== null && !alvo.direct.liberado;
  const limpo = texto.trim();
  const passou = texto.length > MAXIMO_DO_TEXTO_A_MAO;
  const podeEnviar = alvo !== null && !enviando && !directBloqueado && limpo.length > 0 && !passou;

  const enviar = async () => {
    if (!podeEnviar) return;
    setEnviando(true);
    try {
      await aoEnviar(modo, limpo);
      setTexto("");
    } catch {
      // O texto fica; quem chama mostra o aviso.
    } finally {
      setEnviando(false);
    }
  };

  const nome = alvo?.autor.usuario ? `@${alvo.autor.usuario}` : (alvo?.autor.nome ?? "");
  return (
    <div className="shrink-0 border-t border-casca-borda bg-white px-6 py-3">
      <AbasDaCasca<ModoDoCompositor>
        aria-label={t("Responder em público")}
        semBorda
        valor={modo}
        aoMudar={aoMudarModo}
        abas={[
          { valor: "responder", rotulo: t("Responder em público") },
          { valor: "direct", rotulo: t("Mandar direct") },
        ]}
      />
      {alvo ? (
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-casca-raia px-2.5 py-0.5 text-[12px] text-casca-texto">
          {t("Respondendo a {usuario}").replace("{usuario}", nome)}
          <button type="button" aria-label={t("Cancelar")} title={t("Cancelar")} onClick={aoCancelar}>
            <X size={12} aria-hidden />
          </button>
        </span>
      ) : null}
      {directBloqueado && alvo && !alvo.direct.liberado ? (
        <p className="mt-2 text-[13px] text-casca-suave">{t(EXPLICACAO_DO_DIRECT[alvo.direct.motivo])}</p>
      ) : (
        <textarea
          rows={3}
          disabled={alvo === null || enviando}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void enviar();
            }
          }}
          placeholder={
            alvo === null
              ? t("Escolha um comentário para responder.")
              : modo === "direct"
                ? t("Escreva a mensagem do direct")
                : t("Escreva a resposta")
          }
          aria-label={modo === "direct" ? t("Escreva a mensagem do direct") : t("Escreva a resposta")}
          className="mt-2 max-h-40 min-h-[76px] w-full resize-y rounded-casca-gatilho border border-casca-borda bg-white p-2.5 text-[14px] text-casca-texto placeholder:text-casca-meta focus-visible:ring-2 focus-visible:ring-casca-marca focus-visible:outline-none disabled:bg-casca-raia"
        />
      )}
      {modo === "direct" && !directBloqueado ? (
        <p className="mt-1 flex items-start gap-1 text-[11px] text-casca-suave">
          <Info size={12} aria-hidden className="mt-px shrink-0" />
          {t(
            "Uma mensagem por comentário, até 7 dias depois dele (regra do Instagram). Ela vai para a conversa do contato em Atendimento.",
          )}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-between">
        <span className={cn("text-[12px]", passou ? "text-casca-alerta" : "text-casca-meta")}>
          {texto.length.toLocaleString("pt-BR")}/{MAXIMO_DO_TEXTO_A_MAO.toLocaleString("pt-BR")}
        </span>
        <BotaoDaCasca variante="marca" tamanho="sm" disabled={!podeEnviar} onClick={() => void enviar()}>
          {t("Enviar")}
          <Send size={14} aria-hidden className="ml-1.5" />
        </BotaoDaCasca>
      </div>
    </div>
  );
}
