"use client";
import { IconeDoTipo } from "@/components/escale/atividades/IconeDoTipo";
import { useT } from "@/hooks/i18n/useT";
import type { AtividadeDoNegocio } from "@/lib/escale/negocio/atividades";
import { tituloDoCard } from "@/lib/escale/quadro/aparencia";
import type { Lead } from "@/lib/types/leads";

import { RodapeDoWhatsapp } from "./RodapeDoWhatsapp";

const BOTAO =
  "flex h-[38px] items-center gap-2 rounded-[4px] bg-casca-marca px-4 text-[14px] font-semibold text-white hover:bg-casca-marca-forte disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60";

/**
 * O BOTÃO DE EXECUTAR DE CADA TIPO (fork Escale, Fase 1I; C20, Q8).
 * WhatsApp envia. Ligação (fica para depois, resposta de 17/10), Instagram,
 * Email, Agendamento e Reunião ficam "Em breve". Tarefa não tem botão.
 */
export function RodapeDoTipo({
  lead,
  atividade,
  texto,
  alternar,
}: {
  lead: Lead;
  atividade: AtividadeDoNegocio;
  texto: string;
  alternar: (a: AtividadeDoNegocio) => Promise<unknown>;
}) {
  const t = useT();
  const primeiroNome = tituloDoCard(lead).trim().split(/\s+/)[0] ?? "";
  switch (atividade.tipo) {
    case "whatsapp":
      return (
        <RodapeDoWhatsapp lead={lead} atividade={atividade} texto={texto} alternar={alternar} />
      );
    case "ligacao":
      return (
        <button type="button" disabled title={t("Em breve")} className={BOTAO}>
          <IconeDoTipo tipo="ligacao" tamanho={18} />
          {t("Chamar {nome}").replace("{nome}", primeiroNome)}
        </button>
      );
    case "instagram":
      return (
        <button type="button" disabled title={t("Em breve")} className={BOTAO}>
          <IconeDoTipo tipo="instagram" tamanho={18} />
          {t("Enviar mensagem")}
        </button>
      );
    case "email":
      return (
        <button type="button" disabled title={t("Em breve")} className={BOTAO}>
          <IconeDoTipo tipo="email" tamanho={18} />
          {t("Enviar email")}
        </button>
      );
    case "agendamento":
    case "reuniao":
      return (
        <button type="button" disabled title={t("Em breve")} className={BOTAO}>
          <IconeDoTipo tipo={atividade.tipo} tamanho={18} />
          {t("Agendar")}
        </button>
      );
    default:
      return null;
  }
}
