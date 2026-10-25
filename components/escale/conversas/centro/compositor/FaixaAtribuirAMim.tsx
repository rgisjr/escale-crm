"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useClaimConversation } from "@/hooks/inbox/useClaimConversation";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";

const MODOS_RESTRITOS = new Set(["own", "own_and_unassigned"]);

/**
 * "Atribuir a mim · Você só pode responder em conversas atribuídas a você."
 * (C11; N17): só quando a organização restringe a visão (`visibility_mode`)
 * e a conversa não é minha. Sem dono, a faixa oferece assumir; com outro
 * dono, só avisa (a RLS do original já recusa o envio).
 */
export function FaixaAtribuirAMim({ conversa }: { conversa: ConversationWithContact }) {
  const t = useT();
  const { user, activeOrg } = useAuth();
  const reivindicar = useClaimConversation();
  const modo = (activeOrg as { visibility_mode?: string } | null)?.visibility_mode ?? "all";
  if (!MODOS_RESTRITOS.has(modo)) return null;
  if (conversa.assigned_to_user_id === user.id) return null;
  const semDono = !conversa.assigned_to_user_id;
  return (
    <div
      className="flex items-center gap-3 border-t border-casca-borda bg-casca-busca px-4 py-2 text-[14px] text-casca-suave"
      data-testid="faixa-atribuir-a-mim"
    >
      <span className="flex-1">{t("Você só pode responder em conversas atribuídas a você.")}</span>
      {semDono ? (
        <BotaoDaCasca
          variante="marca"
          tamanho="sm"
          disabled={reivindicar.isPending}
          onClick={() =>
            reivindicar.mutate({ conversation_id: conversa.id, expected_assignee: null }, {})
          }
        >
          {t("Atribuir a mim")}
        </BotaoDaCasca>
      ) : null}
    </div>
  );
}
