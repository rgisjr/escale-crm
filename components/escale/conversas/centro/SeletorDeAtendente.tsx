"use client";
import * as Popover from "@radix-ui/react-popover";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useClaimConversation } from "@/hooks/inbox/useClaimConversation";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useMinhasPermissoes } from "@/hooks/escale/usePermissoesDeAtendimento";
import { useLiberarDeOutro } from "@/hooks/escale/useSetores";
import { useReleaseConversation } from "@/hooks/inbox/useReleaseConversation";
import { useTransferConversation } from "@/hooks/inbox/useTransferConversation";
import { corDoAvatar, inicialDoNome } from "@/lib/escale/quadro/aparencia";
import { Check, ChevronDown, Search, UserX } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const LINHA =
  "flex h-9 w-full cursor-pointer items-center gap-2 px-3 text-left text-[12px] text-casca-texto hover:bg-casca-raia aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

function Inicial({ nome, tamanho = 24 }: { nome: string; tamanho?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
      style={{ width: tamanho, height: tamanho, background: corDoAvatar(nome) }}
    >
      {inicialDoNome(nome)}
    </span>
  );
}

/**
 * O SELETOR DE ATENDENTE DO CABEÇALHO (c04; C1; N10): a troca é imediata.
 * Outro membro → transferir; eu → reivindicar; "Sem atendente" → liberar, e
 * a rota do original só libera o PRÓPRIO atendimento (diferença declarada).
 */
export function SeletorDeAtendente({ conversa }: { conversa: ConversationWithContact }) {
  const t = useT();
  const { user } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const { data: membros = [] } = useAssignableMembers(aberto);
  const transferir = useTransferConversation();
  const reivindicar = useClaimConversation();
  const liberar = useReleaseConversation();
  const atualId = conversa.assigned_to_user_id ?? null;
  const souOAtendente = atualId === user.id;
  const nomeAtual =
    conversa.assigned_to_user_name?.trim() || (atualId ? t("Atendente") : t("Sem atendente"));
  const minhas = useMinhasPermissoes();
  const liberarDeOutro = useLiberarDeOutro();
  const podeLiberarOutros =
    minhas.CHAT_CHANGE_ATTENDANT_ALL === true || minhas.CHAT_CHANGE_ATTENDANT_TEAM === true;
  const ocupado =
    transferir.isPending || reivindicar.isPending || liberar.isPending || liberarDeOutro.isPending;

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return membros
      .map((m) => ({ id: m.user_id, nome: m.full_name?.trim() || t("Atendente") }))
      .filter((m) => !termo || m.nome.toLowerCase().includes(termo))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [membros, busca, t]);

  const aoConflito = (err: unknown) => {
    const status = (err as { status?: number }).status;
    if (status === 409) toast.error(t("O atendente já foi alterado por outro usuário!"));
  };
  const escolher = (id: string | null) => {
    setAberto(false);
    if (id === atualId) return;
    if (id === null) {
      if (souOAtendente) liberar.mutate({ conversation_id: conversa.id }, { onError: aoConflito });
      else
        liberarDeOutro.mutate(conversa.id, {
          onError: (err) => {
            const status = (err as { status?: number }).status;
            if (status === 403)
              toast.error(
                t("Só o atendente atual ou quem pode alterar atendentes libera a conversa."),
              );
            else if (status === 409) aoConflito(err);
            else showApiError(err);
          },
        });
    } else if (id === user.id) {
      reivindicar.mutate(
        { conversation_id: conversa.id, expected_assignee: atualId },
        { onError: aoConflito },
      );
    } else {
      transferir.mutate({ conversation_id: conversa.id, to_user_id: id }, { onError: aoConflito });
    }
  };
  const podeLiberar = atualId === null || souOAtendente || podeLiberarOutros;

  return (
    <Popover.Root
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (!o) setBusca("");
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={ocupado}
          className="flex h-8 max-w-[220px] items-center gap-2 rounded-casca-gatilho px-2 text-[12px] text-casca-texto hover:bg-casca-raia disabled:opacity-60"
          aria-label={`${t("Atendente")}: ${nomeAtual}`}
        >
          {atualId ? (
            <Inicial nome={nomeAtual} />
          ) : (
            <UserX size={16} aria-hidden className="text-casca-suave" />
          )}
          <span className="truncate">{nomeAtual}</span>
          <ChevronDown size={14} aria-hidden className="shrink-0 text-casca-chevron" />
        </button>
      </Popover.Trigger>
      <PainelSuspenso align="end" className="w-[250px] p-0">
        <div className="flex h-8 items-center gap-2 border-b border-casca-borda px-3">
          <input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar por…")}
            aria-label={t("Buscar atendente")}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-casca-texto outline-hidden placeholder:text-casca-meta"
          />
          <Search size={14} aria-hidden className="text-casca-suave" />
        </div>
        <ul
          role="listbox"
          aria-label={t("Atendente")}
          className="max-h-[288px] overflow-y-auto py-1"
        >
          <li
            role="option"
            aria-selected={atualId === null}
            aria-disabled={!podeLiberar}
            title={
              podeLiberar
                ? undefined
                : t("Só o atendente atual ou quem pode alterar atendentes libera a conversa.")
            }
            className={LINHA}
            onClick={() => podeLiberar && escolher(null)}
          >
            <UserX size={16} aria-hidden className="text-casca-suave" />
            <span className="flex-1">{t("Sem atendente")}</span>
            {atualId === null ? <Check size={14} aria-hidden className="text-casca-marca" /> : null}
          </li>
          {lista.map((m) => (
            <li
              key={m.id}
              role="option"
              aria-selected={m.id === atualId}
              className={cn(LINHA)}
              onClick={() => escolher(m.id)}
            >
              <Inicial nome={m.nome} />
              <span className="flex-1 truncate">{m.nome}</span>
              {m.id === atualId ? (
                <Check size={14} aria-hidden className="text-casca-marca" />
              ) : null}
            </li>
          ))}
          {lista.length === 0 ? (
            <li className="px-3 py-2 text-[12px] text-casca-suave">
              {t("Nenhum atendente encontrado")}
            </li>
          ) : null}
        </ul>
      </PainelSuspenso>
    </Popover.Root>
  );
}
