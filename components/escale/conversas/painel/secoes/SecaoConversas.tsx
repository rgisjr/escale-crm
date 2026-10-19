"use client";
import { useConversasDoContato } from "@/hooks/escale/useConversasDoContato";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { ROTULO_DO_STATUS, classeDoStatus } from "@/lib/escale/negocio/conversas";
import { dataDaMensagem } from "@/lib/escale/quadro/aparencia";
import { cn } from "@/lib/utils";

import { FotoDaConversa } from "../../fila/FotoDaConversa";
import { ICONE_DA_SECAO } from "../SecoesDoPainel";
import { SecaoAberta } from "../SecaoAberta";

/** A seção Conversas (c20): as sessões do contato (1H); clicar abre na própria tela. Os três modos chegam na 3E (F5). */
export function SecaoConversas({
  conversa,
  aoAbrirConversa,
  aoVoltar,
}: {
  conversa: ConversationWithContact;
  aoAbrirConversa: (id: string | null) => void;
  aoVoltar: () => void;
}) {
  const t = useT();
  const contactId = conversa.contacts?.id ?? conversa.contact_id;
  const { data, isLoading, isError } = useConversasDoContato(contactId);
  const sessoes = data ?? [];
  return (
    <SecaoAberta titulo={t("Conversas")} icone={ICONE_DA_SECAO.conversas} aoVoltar={aoVoltar}>
      {isLoading ? (
        <p className="text-[12px] text-casca-suave">{t("Carregando…")}</p>
      ) : isError ? (
        <p className="text-[12px] text-casca-suave">
          {t("Não foi possível carregar as conversas.")}
        </p>
      ) : (
        <ul className="-mx-4">
          {sessoes.map((c) => {
            const atual = c.id === conversa.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-current={atual ? "true" : undefined}
                  onClick={() => aoAbrirConversa(c.id)}
                  className={cn(
                    "flex h-14 w-full items-center gap-3 px-4 text-left hover:bg-casca-raia",
                    atual && "bg-casca-raia shadow-[inset_3px_0_0_var(--color-casca-marca)]",
                  )}
                >
                  <FotoDaConversa conversa={c} tamanho="secao" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center justify-between">
                      <span
                        className={cn(
                          "rounded-sm px-1.5 py-px text-[11px] font-medium",
                          classeDoStatus(c.status),
                        )}
                      >
                        {t(ROTULO_DO_STATUS[c.status as keyof typeof ROTULO_DO_STATUS] ?? c.status)}
                      </span>
                      <span className="text-[11px] text-casca-meta">
                        {dataDaMensagem(c.last_message_at)}
                      </span>
                    </span>
                    <span className="truncate text-[12px] text-casca-texto-2">
                      {c.last_message_preview ?? t("Sem mensagem")}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SecaoAberta>
  );
}
