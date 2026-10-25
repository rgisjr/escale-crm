"use client";
import { useEffect, useState } from "react";

import { NumeroForaDoAr } from "@/components/inbox/NumeroForaDoAr";
import { RetentionNotice } from "@/components/inbox/RetentionNotice";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useConversaDaCasca } from "@/hooks/escale/useConversaDaCasca";
import { useEstadoDoCompositor } from "@/hooks/escale/useEstadoDoCompositor";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import type { AvisoDeRascunho } from "@/lib/inbox/rascunho-sugerido";
import type { Message } from "@/lib/types/messaging";
import { Search, X } from "@/lib/ui/icons-da-casca";

import { JanelaAgendarMensagem } from "@/components/escale/conversas/agendadas/JanelaAgendarMensagem";
import { BarraDeStatus } from "./BarraDeStatus";
import { CabecalhoDaConversa } from "./CabecalhoDaConversa";
import { CompositorDaCasca } from "./compositor/CompositorDaCasca";
import { FaixaEmTransferencia } from "./FaixaEmTransferencia";
import { ThreadDaCasca } from "./thread/ThreadDaCasca";

/**
 * A CONVERSA ABERTA NA CASCA (fork Escale, Fase 3A → 3B): o cabeçalho, a
 * barra de status, a thread e o compositor da Clint. Os avisos do original
 * que não têm equivalente na Clint (retenção, número fora do ar) ficam.
 */
export function ConversaAberta({
  conversa,
  rascunho,
  aoAbrirConversa,
  aoIniciarConversa,
  aoAbrirFicha,
  aoMudarNaoLida,
}: {
  conversa: ConversationWithContact;
  rascunho: AvisoDeRascunho | null;
  aoAbrirConversa: (id: string | null) => void;
  aoIniciarConversa?: () => void;
  aoAbrirFicha?: () => void;
  /** FORK ESCALE · Fase 3B (N6): a casca para de chamar mark-read enquanto a conversa fica marcada como não lida. */
  aoMudarNaoLida?: (id: string | null) => void;
}) {
  const t = useT();
  const [busca, setBusca] = useState<{ conversaId: string; termo: string } | null>(null);
  const [respondendo, setRespondendo] = useState<Message | null>(null);
  const [agendando, setAgendando] = useState<{ texto: string } | null>(null);
  const [naoLidaManual, setNaoLidaManual] = useState<string | null>(null);
  const buscaAberta = busca !== null && busca.conversaId === conversa.id;
  const acoes = useConversaDaCasca(conversa.id);
  // FORK ESCALE · Fase 3E: a regra do compositor mora no hook, que a conversa embutida também usa.
  const { modo, bloqueio, ultimaFoiTemplate, agora } = useEstadoDoCompositor(conversa);
  useEffect(() => {
    setRespondendo(null);
    if (
      rascunho &&
      rascunho.conversationId === conversa.id &&
      rascunho.leitura.estado === "sugerido"
    ) {
      setAgendando(null);
    }
  }, [conversa.id, rascunho]);

  const textoSugerido =
    rascunho && rascunho.conversationId === conversa.id && rascunho.leitura.estado === "sugerido"
      ? rascunho.leitura.texto
      : "";

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="conversa-aberta">
      {aoAbrirFicha ? (
        <div className="flex h-9 shrink-0 items-center justify-end border-b border-casca-borda px-2 xl:hidden">
          <BotaoDaCasca variante="texto" tamanho="sm" onClick={aoAbrirFicha}>
            {t("Ficha")}
          </BotaoDaCasca>
        </div>
      ) : null}
      <CabecalhoDaConversa
        conversa={conversa}
        aoAbrirConversa={aoAbrirConversa}
        aoIniciarConversa={aoIniciarConversa}
        aoBuscar={() =>
          buscaAberta ? setBusca(null) : setBusca({ conversaId: conversa.id, termo: "" })
        }
        buscaAberta={buscaAberta}
        naoLidaManual={naoLidaManual === conversa.id}
        aoMarcarNaoLida={() =>
          acoes.marcarNaoLida.mutate(undefined, {
            onSuccess: () => {
              setNaoLidaManual(conversa.id);
              aoMudarNaoLida?.(conversa.id);
            },
          })
        }
      />
      {buscaAberta ? (
        <div className="flex items-center gap-2 border-b border-casca-borda px-4 py-1.5">
          <Search size={16} aria-hidden className="shrink-0 text-casca-suave" />
          <input
            type="search"
            autoFocus
            className="min-w-0 flex-1 bg-transparent py-1 text-[15px] text-casca-texto outline-hidden placeholder:text-casca-meta"
            aria-label={t("Buscar nesta conversa")}
            placeholder={t("Buscar nesta conversa")}
            value={busca.termo}
            onChange={(e) => setBusca({ conversaId: busca.conversaId, termo: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Escape") setBusca(null);
            }}
          />
          <BotaoDaCasca
            variante="icone"
            tamanho="sm"
            aria-label={t("Fechar busca")}
            onClick={() => setBusca(null)}
          >
            <X size={16} aria-hidden />
          </BotaoDaCasca>
        </div>
      ) : null}
      <BarraDeStatus conversa={conversa} ultimaFoiTemplate={ultimaFoiTemplate} agora={agora} />
      <div className="min-h-0 flex-1 overflow-hidden">
        <ThreadDaCasca
          conversationId={conversa.id}
          conversa={conversa}
          searchTerm={buscaAberta ? busca.termo : ""}
          aoResponder={setRespondendo}
        />
      </div>
      <RetentionNotice conversationId={conversa.id} />
      {conversa.contacts?.id ? (
        <NumeroForaDoAr
          key={`numero:${conversa.id}`}
          conversationId={conversa.id}
          channelSessionId={conversa.channel_session_id}
          contactId={conversa.contacts.id}
          contactPhone={conversa.contacts.phone_number ?? null}
          onAbrirConversa={aoAbrirConversa}
        />
      ) : null}
      <FaixaEmTransferencia conversa={conversa} />
      <CompositorDaCasca
        key={`compositor:${conversa.id}`}
        conversationId={conversa.id}
        conversa={conversa}
        modo={modo}
        bloqueio={bloqueio}
        respondendo={respondendo}
        aoCancelarResposta={() => setRespondendo(null)}
        aoAgendar={(texto) => setAgendando({ texto })}
        textoInicial={textoSugerido}
      />
      <JanelaAgendarMensagem
        aberta={agendando !== null}
        aoFechar={() => setAgendando(null)}
        conversa={conversa}
        textoInicial={agendando?.texto ?? ""}
        modo={modo}
      />
    </div>
  );
}
