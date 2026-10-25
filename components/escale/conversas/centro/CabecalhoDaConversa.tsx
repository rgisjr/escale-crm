"use client";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { toast } from "sonner";

import { FotoDaConversa } from "@/components/escale/conversas/fila/FotoDaConversa";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { copyToClipboard } from "@/lib/clipboard";
import { rotuloDoContato } from "@/lib/contacts/rotulo-do-contato";
import { rotuloDoCanal } from "@/lib/escale/conversas/linha";
import { Copy, Ellipsis, MailOpen, MessageSquare, Search } from "@/lib/ui/icons-da-casca";
import { InstagramLogo } from "@/lib/ui/icons";

import { SeletorDeAtendente } from "./SeletorDeAtendente";
import { SeletorDeSetor } from "./SeletorDeSetor";

const ITEM =
  "flex h-9 w-full items-center gap-3 px-3 text-left text-[14px] text-casca-texto hover:bg-casca-raia disabled:cursor-not-allowed disabled:opacity-50";

/**
 * O CABEÇALHO DA CONVERSA (c02, c03; C1): foto 40px, nome 13px/600, o canal
 * e o dispositivo em 11px, o seletor de atendente, a busca e o ⋮ "Mais".
 * `rotuloDoCanal` (3A) dá "WhatsApp"/"Instagram" a partir do provider e da
 * plataforma social.
 */
export function CabecalhoDaConversa({
  conversa,
  aoAbrirConversa,
  aoIniciarConversa,
  aoBuscar,
  buscaAberta,
  naoLidaManual,
  aoMarcarNaoLida,
}: {
  conversa: ConversationWithContact;
  aoAbrirConversa: (id: string | null) => void;
  /** "Iniciar uma conversa": abre a tela de conversa nova (só fechar a atual deixava o centro vazio). */
  aoIniciarConversa?: () => void;
  aoBuscar: () => void;
  buscaAberta: boolean;
  naoLidaManual: boolean;
  aoMarcarNaoLida: () => void;
}) {
  const t = useT();
  const [menu, setMenu] = useState(false);
  const nome = rotuloDoContato(conversa.contacts, t);
  const canal = rotuloDoCanal(conversa.channel_sessions ?? null);
  const dispositivo =
    conversa.channel_sessions?.display_name?.trim() ||
    conversa.channel_sessions?.phone_number ||
    "";
  const ehInstagram = conversa.channel_sessions?.social_platform === "instagram";
  const usuarioDoInstagram =
    (conversa.contacts as { instagram_username?: string | null } | null | undefined)
      ?.instagram_username ?? null;

  const copiarLink = async () => {
    setMenu(false);
    const copiou = await copyToClipboard(`${window.location.origin}/app/inbox?id=${conversa.id}`);
    if (copiou) toast.success(t("O link foi copiado para a área de transferência!"));
    else toast.error(t("Não foi possível copiar o link."));
  };

  return (
    <header
      className="flex h-14 shrink-0 items-center gap-3 border-b border-casca-borda px-4"
      data-testid="cabecalho-da-conversa"
    >
      <FotoDaConversa conversa={conversa} tamanho="topo" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-casca-texto">{nome}</div>
        <div className="truncate text-[12px] text-casca-suave">
          {dispositivo ? `${canal} - ${dispositivo}` : canal}
        </div>
      </div>
      <SeletorDeSetor conversa={conversa} />
      <SeletorDeAtendente conversa={conversa} />
      <BotaoDaCasca
        variante="icone"
        tamanho="sm"
        aria-label={t("Buscar nesta conversa")}
        title={t("Buscar nesta conversa")}
        aria-pressed={buscaAberta}
        onClick={aoBuscar}
      >
        <Search size={16} aria-hidden />
      </BotaoDaCasca>
      <Popover.Root open={menu} onOpenChange={setMenu}>
        <Popover.Trigger asChild>
          <BotaoDaCasca variante="icone" tamanho="sm" aria-label={t("Mais")} title={t("Mais")}>
            <Ellipsis size={16} aria-hidden />
          </BotaoDaCasca>
        </Popover.Trigger>
        <PainelSuspenso align="end" className="w-[190px] py-1">
          <button
            type="button"
            className={ITEM}
            onClick={() => {
              setMenu(false);
              if (aoIniciarConversa) aoIniciarConversa();
              else aoAbrirConversa(null);
            }}
          >
            <MessageSquare size={16} aria-hidden className="text-casca-suave" />
            {t("Iniciar uma conversa")}
          </button>
          <button type="button" className={ITEM} onClick={copiarLink}>
            <Copy size={16} aria-hidden className="text-casca-suave" />
            {t("Copiar link da conversa")}
          </button>
          <button
            type="button"
            className={ITEM}
            disabled={naoLidaManual}
            onClick={() => {
              setMenu(false);
              aoMarcarNaoLida();
            }}
          >
            <MailOpen size={16} aria-hidden className="text-casca-suave" />
            {t("Marcar como não lida")}
          </button>
          {ehInstagram ? (
            <a
              className={ITEM}
              aria-disabled={!usuarioDoInstagram}
              href={usuarioDoInstagram ? `https://instagram.com/${usuarioDoInstagram}` : undefined}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMenu(false)}
            >
              <InstagramLogo size={16} aria-hidden className="text-casca-suave" />
              {t("Abrir no Instagram")}
            </a>
          ) : null}
        </PainelSuspenso>
      </Popover.Root>
    </header>
  );
}
