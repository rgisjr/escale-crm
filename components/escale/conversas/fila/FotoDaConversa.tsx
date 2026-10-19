"use client";
import { useState } from "react";

import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import { corDoAvatar, inicialDoNome } from "@/lib/escale/quadro/aparencia";
import { cn } from "@/lib/utils";

const TAMANHO = {
  linha: "size-11 text-[15px]",
  secao: "size-9 text-[13px]",
  topo: "size-10 text-[14px]",
} as const;

/** A foto redonda do contato com o selo do canal no canto (c01). */
export function FotoDaConversa({
  conversa,
  tamanho = "linha",
  className,
}: {
  conversa: ConversationWithContact;
  tamanho?: keyof typeof TAMANHO;
  className?: string;
}) {
  const [falhou, setFalhou] = useState(false);
  const c = conversa.contacts;
  const nome = nomeDoContato(c) ?? "";
  const temFoto = Boolean(c?.avatar_storage_path) && !falhou && Boolean(c?.id);
  return (
    <span className={cn("relative shrink-0", className)}>
      {temFoto ? (
        <img
          src={`/api/v1/contacts/${c!.id}/avatar`}
          alt=""
          className={cn("rounded-full object-cover", TAMANHO[tamanho])}
          onError={() => setFalhou(true)}
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            "grid place-items-center rounded-full font-medium text-white",
            TAMANHO[tamanho],
          )}
          style={{ backgroundColor: corDoAvatar(c?.id ?? conversa.id) }}
        >
          {inicialDoNome(nome)}
        </span>
      )}
      <span className="absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full bg-surface">
        <ChannelLogo channel={conversa.channel_sessions} size={12} />
      </span>
    </span>
  );
}
