"use client";

import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import type { ResumoDaPreparacao } from "@/lib/escale/campanhas/acoes-do-assistente";
import type { EstadoDoAssistente } from "@/lib/escale/campanhas/estado-do-assistente";
import type { NumeroDaCampanha } from "@/lib/escale/campanhas/numeros";
import { quandoNoResumo, textoDoMotivo } from "@/lib/escale/campanhas/textos-do-assistente";
import {
  Clock,
  ExternalLink,
  HelpCircle,
  Loader2,
  Send,
  Tag,
  Users,
  Zap,
} from "@/lib/ui/icons-da-casca";

import { ResumoDoEnvio } from "../molde/ResumoDoEnvio";
import { TITULO_DO_PASSO } from "../molde/estilos";
import { JanelaContatosSelecionados } from "./JanelaContatosSelecionados";
import { JanelaTesteDaCampanha } from "./JanelaTesteDaCampanha";

const LIMITES_DA_META = "https://developers.facebook.com/docs/whatsapp/messaging-limits";

/**
 * PASSO 4 — "Confirme seu envio" (fork Escale, Fase 8B; 09-044, 09-045; N14,
 * N15). A lista já está congelada (a página preparou ao entrar): mostra os
 * elegíveis, quem ficou fora e por quê, a base legal, o teste, o custo "—" e o
 * aviso de limites.
 */
export function PassoConfirmar({
  estado,
  resumo,
  preparando,
  erroDaPreparacao,
  numero,
  fuso,
}: {
  estado: EstadoDoAssistente;
  resumo: ResumoDaPreparacao | null;
  preparando: boolean;
  erroDaPreparacao: string | null;
  numero: NumeroDaCampanha | null;
  fuso?: string;
}) {
  const t = useT();
  const d = estado.dados;
  const [contatos, setContatos] = useState(false);
  const [motivos, setMotivos] = useState(false);
  const [teste, setTeste] = useState(false);
  const elegiveis = resumo?.elegiveis ?? 0;
  const enviarPara =
    elegiveis === 1
      ? t("1 contato selecionado")
      : t("{n} contatos selecionados").replace("{n}", numeroBr(elegiveis));

  return (
    <div className="max-w-[595px] space-y-4">
      <h1 className={TITULO_DO_PASSO}>{t("Confirme seu envio de mensagem de Whatsapp")}</h1>
      {preparando && (
        <p role="status" className="flex items-center gap-2 text-[13px] text-casca-texto-2">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t("Preparando a lista de envio…")}
        </p>
      )}
      {erroDaPreparacao && (
        <p
          role="alert"
          className="rounded-[8px] bg-(--escale-tom-vermelho-fundo) px-4 py-3 text-[13px] text-(--escale-tom-vermelho-texto)"
        >
          {erroDaPreparacao}
        </p>
      )}
      <ResumoDoEnvio
        linhas={[
          { icone: <Tag className="size-3.5" />, rotulo: t("Nome da campanha"), valor: d.nome },
          {
            icone: <Zap className="size-3.5" />,
            rotulo: t("Quando enviar"),
            valor: t(quandoNoResumo(d.quando, fuso)),
          },
          {
            icone: <Users className="size-3.5" />,
            rotulo: t("Enviar para"),
            valor: (
              <span className="flex flex-wrap items-center gap-x-2">
                {enviarPara}
                <button
                  type="button"
                  onClick={() => setContatos(true)}
                  className="font-semibold text-casca-texto"
                >
                  {t("Ver contatos")}
                </button>
                {resumo && resumo.excluidos > 0 && (
                  <>
                    <span className="text-casca-meta">·</span>
                    <span className="text-casca-texto-2">
                      {t("{n} fora da lista").replace("{n}", numeroBr(resumo.excluidos))}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMotivos(!motivos)}
                      className="font-semibold text-casca-marca"
                    >
                      {motivos ? t("Ocultar motivos") : t("Ver motivos")}
                    </button>
                  </>
                )}
              </span>
            ),
          },
          {
            icone: <Send className="size-3.5" />,
            rotulo: t("Base legal"),
            valor: (
              <span className="flex flex-wrap items-center gap-x-3">
                {d.baseLegal === "consent"
                  ? t("Consentimento")
                  : `${t("Interesse legítimo")} · ${d.lia ?? ""}`}
                {estado.campanhaId && (
                  <button
                    type="button"
                    onClick={() => setTeste(true)}
                    disabled={!resumo}
                    className="font-semibold text-casca-marca disabled:opacity-40"
                  >
                    {t("Enviar teste")}
                  </button>
                )}
              </span>
            ),
          },
        ]}
        rodape={
          <div className="flex h-12 items-center justify-between bg-casca-marca-suave px-4">
            <span className="text-[13px] font-medium text-casca-marca">{t("Custo estimado:")}</span>
            <span className="text-[15px] font-bold text-casca-marca">—</span>
          </div>
        }
      />
      {motivos && resumo && (
        <ul className="space-y-1 rounded-[8px] border border-casca-borda p-3 text-[13px]">
          {resumo.motivos.map((m) => (
            <li key={m.motivo} className="flex justify-between gap-3">
              <span className="text-casca-texto">{t(textoDoMotivo(m.motivo))}</span>
              <span className="text-casca-texto-2">{numeroBr(m.quantidade)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-[8px] border-l-[3px] border-casca-marca bg-casca-marca-suave p-4">
        <p className="flex items-center gap-2 text-[13px] font-medium text-casca-marca">
          <HelpCircle className="size-3.5" aria-hidden />
          {t("Limites de envio do WhatsApp")}
        </p>
        <p className="mt-1 pl-[22px] text-[12px] text-casca-suave">
          {t(
            "O WhatsApp possui limites diários de envio definidos pela Meta. A quantidade de conversas que você pode iniciar por dia depende do tipo de conexão e da qualidade dos seus envios.",
          )}{" "}
          <a
            href={LIMITES_DA_META}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-casca-texto"
          >
            {t("Saiba mais")}
            <ExternalLink className="size-3" aria-hidden />
          </a>
        </p>
        <p className="mt-3 flex items-center gap-2 border-t border-casca-divisoria pt-3 pl-[22px] text-[12px] text-casca-meta">
          <Clock className="size-3" aria-hidden />
          {t("Seu envio poderá demorar alguns minutos para ser concluído.")}
        </p>
      </div>
      {numero && !numero.conectado && (
        <p role="alert" className="text-[12px] text-casca-alerta">
          {t("O número escolhido está fora do ar. A campanha só sai quando ele voltar.")}
        </p>
      )}
      <JanelaContatosSelecionados
        aberta={contatos}
        aoFechar={() => setContatos(false)}
        publico={d.publico}
      />
      {teste && estado.campanhaId && (
        <JanelaTesteDaCampanha
          aberta
          aoFechar={() => setTeste(false)}
          campanhaId={estado.campanhaId}
        />
      )}
    </div>
  );
}
