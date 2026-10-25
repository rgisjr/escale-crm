"use client";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";

import { MonogramaDoSetor } from "@/components/escale/conversas/configuracoes/MonogramaDoSetor";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { useAlterarSetor, useSetores, useSetoresDasConversas } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { filtrarSetores, ordenarSetores } from "@/lib/escale/conversas/setores";
import { Building2, Check, Search } from "@/lib/ui/icons-da-casca";

const LINHA =
  "flex h-9 w-full cursor-pointer items-center gap-2 px-3 text-left text-[14px] text-casca-texto hover:bg-casca-raia";

/** O selo do setor no cabeçalho (c02; E3) e "Alterar setor" (C3, N7): o setor novo entra em transferência. */
export function SeletorDeSetor({ conversa }: { conversa: ConversationWithContact }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const { data: setores = [] } = useSetores();
  const doSetor = useSetoresDasConversas([conversa.id])[conversa.id];
  const { alterar } = useAlterarSetor(conversa.id);
  const atual = doSetor?.setor ?? null;
  const lista = ordenarSetores(filtrarSetores(setores, busca));
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
          aria-label={`${t("Alterar setor")}: ${atual?.nome ?? t("Sem setor")}`}
          title={t("Alterar setor")}
          disabled={alterar.isPending}
          className="grid size-7 place-items-center rounded-casca-gatilho hover:bg-casca-raia"
        >
          {atual ? (
            <MonogramaDoSetor
              setor={atual}
              tamanho="cabecalho"
              tracejado={doSetor?.em_transferencia}
            />
          ) : (
            <Building2 size={16} aria-hidden className="text-casca-suave" />
          )}
        </button>
      </Popover.Trigger>
      <PainelSuspenso align="end" className="w-[250px] p-0">
        <div className="flex h-8 items-center gap-2 border-b border-casca-borda px-3">
          <input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar por setor...")}
            aria-label={t("Buscar setor")}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-casca-texto outline-hidden placeholder:text-casca-meta"
          />
          <Search size={14} aria-hidden className="text-casca-suave" />
        </div>
        <ul role="listbox" aria-label={t("Setores")} className="max-h-[288px] overflow-y-auto py-1">
          {lista.map((s) => (
            <li
              key={s.id}
              role="option"
              aria-selected={s.id === atual?.id}
              className={LINHA}
              onClick={() => {
                setAberto(false);
                if (s.id !== atual?.id) alterar.mutate(s.id);
              }}
            >
              <MonogramaDoSetor setor={s} tamanho="cabecalho" />
              <span className="flex-1 truncate">{s.nome}</span>
              {s.id === atual?.id ? (
                <Check size={14} aria-hidden className="text-casca-marca" />
              ) : null}
            </li>
          ))}
          {lista.length === 0 ? (
            <li className="px-3 py-2 text-[14px] text-casca-suave">
              {t("Nenhum setor encontrado...")}
            </li>
          ) : null}
        </ul>
      </PainelSuspenso>
    </Popover.Root>
  );
}
