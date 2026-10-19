"use client";
import { useState } from "react";
import { toast } from "sonner";

import { useT } from "@/hooks/i18n/useT";
import { useDraftReply } from "@/hooks/inbox/useDraftReply";
import { CHIPS_DO_ASSISTENTE, NOME_DO_ASSISTENTE } from "@/lib/escale/conversas/assistente";
import { Send, Sparkles, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O BALÃO DO ASSISTENTE (c11; C10; N13): 380px acima do primeiro ícone.
 * "Sugerir resposta" chama o `draft-reply` do original e põe o texto no campo;
 * os outros chips e a pergunta livre ficam "Em breve".
 */
export function BalaoDoAssistente({
  aberto,
  aoFechar,
  conversationId,
  contato,
  aoInserir,
}: {
  aberto: boolean;
  aoFechar: () => void;
  conversationId: string;
  contato: string;
  aoInserir: (texto: string) => void;
}) {
  const t = useT();
  const sugerir = useDraftReply();
  const [pergunta, setPergunta] = useState("");
  if (!aberto) return null;
  const aoSugerir = async () => {
    const r = await sugerir.mutateAsync(conversationId);
    const texto = r.data.draft?.trim();
    if (!texto) {
      toast.info(t("Não consegui sugerir uma resposta agora."));
      return;
    }
    aoInserir(texto);
    toast.success(t("Sugestão inserida no campo de mensagem."));
    aoFechar();
  };
  return (
    <div
      className="absolute bottom-full left-4 z-20 mb-2 w-[380px] rounded-casca-gatilho border border-casca-borda bg-white shadow-casca-painel"
      data-testid="balao-do-assistente"
    >
      <div className="flex items-center gap-3 border-b border-casca-borda px-4 py-3">
        <span className="grid size-8 place-items-center rounded-full bg-casca-marca text-white">
          <Sparkles size={16} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-casca-texto">{NOME_DO_ASSISTENTE}</div>
          <div className="truncate text-[11px] text-casca-suave">{contato}</div>
        </div>
        <button
          type="button"
          className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
          aria-label={t("Fechar")}
          onClick={aoFechar}
        >
          <X size={14} aria-hidden />
        </button>
      </div>
      <div className="px-4 py-3 text-[12px] text-casca-suave">
        <p className="mb-3">{`${NOME_DO_ASSISTENTE} ${t("agora lê esta conversa")}. ${t("Peça uma sugestão de resposta ou um resumo do atendimento.")}`}</p>
        <div className="flex flex-wrap gap-2">
          {CHIPS_DO_ASSISTENTE.map((c) => (
            <button
              key={c.chave}
              type="button"
              disabled={!c.disponivel || sugerir.isPending}
              title={c.disponivel ? undefined : t("Em breve")}
              className={cn(
                "h-7 rounded-full border border-casca-borda px-3 text-[12px] text-casca-texto hover:bg-casca-raia disabled:cursor-not-allowed disabled:opacity-50",
              )}
              onClick={c.chave === "sugerir" ? () => void aoSugerir() : undefined}
            >
              {sugerir.isPending && c.chave === "sugerir" ? t("Pensando…") : t(c.rotulo)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-casca-borda px-4 py-2">
        <input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder={t("Pergunte sobre esta conversa…")}
          disabled
          title={t("Em breve")}
          className="min-w-0 flex-1 bg-transparent text-[12px] outline-hidden placeholder:text-casca-meta disabled:opacity-60"
        />
        <button
          type="button"
          disabled
          title={t("Em breve")}
          aria-label={t("Enviar pergunta")}
          className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave disabled:opacity-40"
        >
          <Send size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
