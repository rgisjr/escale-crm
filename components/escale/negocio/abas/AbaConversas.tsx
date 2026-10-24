"use client";
import { useState, type ReactNode } from "react";

import { useConversasDoContato } from "@/hooks/escale/useConversasDoContato";
import { useT } from "@/hooks/i18n/useT";
import { ROTULO_DO_STATUS, classeDoStatus } from "@/lib/escale/negocio/conversas";
import { dataDaMensagem } from "@/lib/escale/quadro/aparencia";
import { CheckCheck, Glasses, MessagesSquare } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { ConversaEmLeitura } from "./ConversaEmLeitura";

/**
 * A ABA CONVERSAS DA FICHA (fork Escale, Fases 1G e 1H; C16, N9; print 05).
 *
 * Todas as sessões do contato, como na Clint atual (sem filtros, Q7). Clicar
 * escolhe a sessão, que abre à direita em leitura (2E, N7); responder dali é da
 * 3E, e o modo espião segue "Em breve" (Q6).
 */
export function AbaConversas({ contatoId, foto }: { contatoId: string | null; foto: ReactNode }) {
  const t = useT();
  const { data, isLoading, isError } = useConversasDoContato(contatoId);
  const sessoes = data ?? [];
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const atual = sessoes.find((c) => c.id === escolhida) ?? sessoes[0] ?? null;
  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-6">
      <div className="flex h-10 shrink-0 items-center justify-between rounded-t-lg bg-casca-raia px-4 text-[13px] text-casca-texto-2">
        <span className="flex items-center gap-2">
          <Glasses size={16} aria-hidden />
          {t("Abra as conversas sem marcá-las como lidas.")}
        </span>
        <button
          type="button"
          disabled
          title={t("Em breve")}
          className="text-[13px] text-casca-marca underline disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          {t("Ativar modo espião")}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 rounded-b-lg border border-t-0 border-casca-borda">
        <div className="w-[340px] shrink-0 overflow-y-auto border-r border-casca-borda">
          {!contatoId ? (
            <p className="px-3 py-6 text-xs text-casca-suave">
              {t("Este negócio não tem contato.")}
            </p>
          ) : isLoading ? (
            <p className="px-3 py-6 text-xs text-casca-suave">{t("Carregando…")}</p>
          ) : isError ? (
            <p className="px-3 py-6 text-xs text-casca-suave">
              {t("Não foi possível carregar as conversas.")}
            </p>
          ) : sessoes.length === 0 ? (
            <p className="px-3 py-6 text-xs text-casca-suave">
              {t("Este contato não possui conversas no atendimento")}
            </p>
          ) : (
            <>
              <p className="px-3 py-3 text-xs font-medium text-casca-texto">{`${sessoes.length} ${t("sessões")}`}</p>
              <ul>
                {sessoes.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setEscolhida(c.id)}
                      aria-pressed={atual?.id === c.id}
                      className={cn(
                        "flex h-[72px] w-full items-center gap-3 border-b border-l-[3px] border-casca-borda border-l-transparent px-3 text-left hover:bg-casca-raia",
                        atual?.id === c.id && "border-l-casca-marca bg-casca-raia",
                      )}
                    >
                      {foto}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between">
                          <span
                            className={cn(
                              "rounded-sm px-1.5 py-px text-[11px] font-medium",
                              classeDoStatus(c.status),
                            )}
                          >
                            {t(
                              ROTULO_DO_STATUS[c.status as keyof typeof ROTULO_DO_STATUS] ??
                                c.status,
                            )}
                          </span>
                          <span className="text-[11px] text-casca-meta">
                            {dataDaMensagem(c.last_message_at)}
                          </span>
                        </span>
                        <span className="mt-1 flex items-center gap-1 text-xs text-casca-texto-2">
                          <CheckCheck size={14} aria-hidden className="shrink-0" />
                          <span className="truncate">
                            {c.last_message_preview ?? t("Sem mensagem")}
                          </span>
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        {c.unread_count_for_assignee > 0 ? (
                          <span className="rounded-sm bg-casca-novo px-1.5 text-[11px] font-semibold text-white">
                            {c.unread_count_for_assignee}
                          </span>
                        ) : null}
                        {c.assigned_to_user_name ? (
                          <span
                            title={`${t("Atendente:")} ${c.assigned_to_user_name}`}
                            className="grid size-5 place-items-center rounded-full bg-casca-marca-suave text-[10px] font-semibold text-casca-marca"
                          >
                            {c.assigned_to_user_name.charAt(0).toUpperCase()}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        {atual && contatoId ? (
          <ConversaEmLeitura conversa={atual} contatoId={contatoId} />
        ) : (
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 text-center">
          <span className="grid size-20 place-items-center rounded-2xl bg-casca-marca-suave text-casca-marca">
            <MessagesSquare size={32} aria-hidden />
          </span>
          <p className="mt-2 text-[17px] font-semibold text-casca-texto">
            {t("Selecione uma conversa")}
          </p>
          <p className="max-w-[210px] text-[15px] text-casca-suave">
            {t("Escolha uma conversa ao lado para ver as mensagens.")}
          </p>
        </div>
        )}
      </div>
    </div>
  );
}
