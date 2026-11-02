"use client";
import type { ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import { EXPLICACAO_DO_DIRECT, type ComentarioDaCaixa } from "@/lib/escale/comentarios/caixa";
import type { ContaParaACaixa } from "@/hooks/escale/useComentarios";
import { Eye, EyeOff, MessageCircle, Send, Trash2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

function Botao({
  rotulo,
  onClick,
  desligado = false,
  dica,
  perigo = false,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  desligado?: boolean;
  dica?: string;
  perigo?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={dica ?? rotulo}
      aria-disabled={desligado || undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (!desligado) onClick();
      }}
      className={cn(
        "grid size-7 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia",
        perigo && "hover:text-casca-alerta",
        desligado && "cursor-not-allowed opacity-50",
      )}
    >
      {children}
    </button>
  );
}

/**
 * FORK ESCALE · Fase 10A (4.4): a fileira de botões de ícone do item de comentário — Responder, Mandar
 * direct, Ocultar/Reexibir e Apagar. A 10D acrescenta `aoCurtir` e o botão "Curtir" aqui.
 */
export function AcoesDoComentario({
  comentario,
  conta,
  aoResponder,
  aoMandarDirect,
  aoOcultar,
  aoApagar,
}: {
  comentario: ComentarioDaCaixa;
  conta: ContaParaACaixa;
  aoResponder: () => void;
  aoMandarDirect: () => void;
  aoOcultar: (ocultar: boolean) => void;
  aoApagar: () => void;
}) {
  const t = useT();
  const direct = comentario.direct;
  const propria = comentario.autor.daPropriaConta;
  return (
    <div className="flex items-center gap-0.5">
      <Botao rotulo={t("Responder")} onClick={aoResponder}>
        <MessageCircle size={14} aria-hidden />
      </Botao>
      {propria ? null : (
        <Botao
          rotulo={t("Mandar direct")}
          dica={direct.liberado ? undefined : t(EXPLICACAO_DO_DIRECT[direct.motivo])}
          desligado={!direct.liberado}
          onClick={aoMandarDirect}
        >
          <Send size={14} aria-hidden />
        </Botao>
      )}
      <Botao rotulo={comentario.oculto ? t("Reexibir") : t("Ocultar")} onClick={() => aoOcultar(!comentario.oculto)}>
        {comentario.oculto ? <Eye size={14} aria-hidden /> : <EyeOff size={14} aria-hidden />}
      </Botao>
      {conta.podeApagar ? (
        <Botao rotulo={t("Apagar")} perigo onClick={aoApagar}>
          <Trash2 size={14} aria-hidden />
        </Botao>
      ) : null}
    </div>
  );
}
