"use client";
import type { ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import { fonteDeTemplates } from "@/lib/channels/templates-fonte";
import { NOME_DO_ASSISTENTE } from "@/lib/escale/conversas/assistente";
import {
  AlarmClock,
  Camera,
  FileText,
  Mic,
  Paperclip,
  PenLine,
  Smile,
  Sparkles,
  Workflow,
  Zap,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export type ChaveDoIcone =
  | "assistente"
  | "emoji"
  | "anexo"
  | "camera"
  | "audio"
  | "respostas"
  | "modelos"
  | "nota"
  | "agendar"
  | "flow"
  | "assinatura";
export interface AcaoDoIcone {
  onClick?: () => void;
  disabled?: boolean;
  ativo?: boolean;
  title?: string;
  /** Quando a peça do original já é um botão (áudio, emoji, anexo), ela entra no lugar do ícone. */
  elemento?: ReactNode;
}

export const BOTAO_DO_ICONE =
  "grid size-7 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia hover:text-casca-texto disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-casca-marca-suave aria-pressed:text-casca-marca";

/** Os 11 ícones do compositor (c02), na ordem da Clint; Flow e assinatura ficam "Em breve". */
export function BarraDeIcones({
  acoes,
  provider,
  compacto = false,
}: {
  acoes: Partial<Record<ChaveDoIcone, AcaoDoIcone>>;
  provider: string | null | undefined;
  compacto?: boolean;
}) {
  const t = useT();
  const temModelos = fonteDeTemplates(provider) !== null;
  const itens: Array<{ chave: ChaveDoIcone; rotulo: string; icone: ReactNode; some?: boolean }> = [
    { chave: "assistente", rotulo: NOME_DO_ASSISTENTE, icone: <Sparkles size={16} aria-hidden /> },
    { chave: "emoji", rotulo: t("Emoji"), icone: <Smile size={16} aria-hidden /> },
    { chave: "anexo", rotulo: t("Anexar"), icone: <Paperclip size={16} aria-hidden /> },
    { chave: "camera", rotulo: t("Câmera"), icone: <Camera size={16} aria-hidden /> },
    { chave: "audio", rotulo: t("Gravar áudio"), icone: <Mic size={16} aria-hidden /> },
    { chave: "respostas", rotulo: t("Respostas rápidas"), icone: <Zap size={16} aria-hidden /> },
    {
      chave: "modelos",
      rotulo: t("Modelos de mensagem"),
      icone: <FileText size={16} aria-hidden />,
      some: !temModelos,
    },
    { chave: "nota", rotulo: t("Nota interna"), icone: <PenLine size={16} aria-hidden /> },
    {
      chave: "agendar",
      rotulo: t("Agendar mensagem"),
      icone: <AlarmClock size={16} aria-hidden />,
    },
    {
      chave: "flow",
      rotulo: t("Enviar Flow"),
      icone: <Workflow size={16} aria-hidden />,
      some: compacto || provider !== "meta_cloud",
    },
    {
      chave: "assinatura",
      rotulo: t("Assinatura"),
      icone: <PenLine size={16} aria-hidden className="rotate-180" />,
      some: compacto,
    },
  ];
  return (
    <div
      className="flex items-center gap-0.5"
      role="toolbar"
      aria-label={t("Ferramentas da mensagem")}
    >
      {itens
        .filter((i) => !i.some)
        .map((i) => {
          const a = acoes[i.chave] ?? {};
          if (a.elemento) return <span key={i.chave}>{a.elemento}</span>;
          const emBreve = i.chave === "flow" || i.chave === "assinatura";
          return (
            <button
              key={i.chave}
              type="button"
              className={cn(BOTAO_DO_ICONE)}
              aria-label={i.rotulo}
              title={emBreve ? t("Em breve") : (a.title ?? i.rotulo)}
              aria-pressed={a.ativo || undefined}
              disabled={emBreve || a.disabled}
              onClick={a.onClick}
            >
              {i.icone}
            </button>
          );
        })}
    </div>
  );
}
