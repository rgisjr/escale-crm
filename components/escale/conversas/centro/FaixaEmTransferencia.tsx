"use client";
import { useAlterarSetor, useSetoresDasConversas } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { ArrowRightLeft } from "@/lib/ui/icons-da-casca";

/** "Em transferência para {setor}" + "Cancelar transferência" (C3, N7; provisório: sem print). */
export function FaixaEmTransferencia({ conversa }: { conversa: ConversationWithContact }) {
  const t = useT();
  const doSetor = useSetoresDasConversas([conversa.id])[conversa.id];
  const { cancelar } = useAlterarSetor(conversa.id);
  if (!doSetor?.em_transferencia || !doSetor.setor) return null;
  return (
    <div
      className="flex h-10 shrink-0 items-center gap-2 border-t border-casca-borda bg-casca-pausa px-4 text-[12px] text-casca-pausa-texto"
      data-testid="faixa-em-transferencia"
    >
      <ArrowRightLeft size={14} aria-hidden />
      <span className="flex-1">{`${t("Em transferência para")} ${doSetor.setor.nome}`}</span>
      <button
        type="button"
        disabled={cancelar.isPending}
        onClick={() => cancelar.mutate()}
        className="font-medium underline-offset-2 hover:underline disabled:opacity-50"
      >
        {t("Cancelar transferência")}
      </button>
    </div>
  );
}
