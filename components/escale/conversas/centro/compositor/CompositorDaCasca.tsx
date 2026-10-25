"use client";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { AttachMenu } from "@/components/inbox/composer/AttachMenu";
import { AttachmentPreviewDialog } from "@/components/inbox/composer/AttachmentPreviewDialog";
import { AudioRecorder } from "@/components/inbox/composer/AudioRecorder";
import {
  ContactPickerDialog,
  type ContactPickPayload,
} from "@/components/inbox/composer/ContactPickerDialog";
import { EmojiButton } from "@/components/inbox/composer/EmojiButton";
import { resolveSlash } from "@/components/inbox/composer/TemplateMenu";
import { useT } from "@/hooks/i18n/useT";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useSendMessage } from "@/hooks/inbox/useSendMessage";
import { useUploadMedia } from "@/hooks/inbox/useUploadMedia";
import { NOME_DO_ASSISTENTE } from "@/lib/escale/conversas/assistente";
import type { ModoDoCompositor } from "@/lib/escale/conversas/janela";
import type { Message } from "@/lib/types/messaging";
import { Send, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { AvisoForaDaJanela } from "./AvisoForaDaJanela";
import { BalaoDoAssistente } from "./BalaoDoAssistente";
import { BarraDeIcones, BOTAO_DO_ICONE } from "./BarraDeIcones";
import { FaixaAtribuirAMim } from "./FaixaAtribuirAMim";
import { JanelaModelosDeMensagem } from "./JanelaModelosDeMensagem";
import { JanelaNotaInterna } from "./JanelaNotaInterna";
import { PainelRespostasRapidas } from "./PainelRespostasRapidas";

const ALTURA_MAX = 160;
type Painel = "assistente" | "respostas" | "modelos" | "nota" | null;

/**
 * O COMPOSITOR DA CLINT (c02, c09–c13, c56, c73; C5–C8, C10, C11; N15–N17).
 * A caixa de 40px que cresce até 160px, os 11 ícones à esquerda e "Enviar"
 * à direita, sobre os hooks e as peças do original. Fora da janela vira o
 * aviso; bloqueado vira o motivo; fechada vira "Reabra o atendimento".
 */
export function CompositorDaCasca({
  conversationId,
  conversa,
  modo,
  bloqueio,
  respondendo,
  aoCancelarResposta,
  aoAgendar,
  compacto = false,
  textoInicial = "",
}: {
  conversationId: string;
  conversa: ConversationWithContact;
  modo: ModoDoCompositor;
  bloqueio: string | null;
  respondendo: Message | null;
  aoCancelarResposta: () => void;
  aoAgendar: (texto: string) => void;
  compacto?: boolean;
  /** O rascunho sugerido do original (?rascunho=) chega aqui. */
  textoInicial?: string;
}) {
  const t = useT();
  const enviar = useSendMessage();
  const upload = useUploadMedia();
  const [texto, setTexto] = useState(textoInicial);
  const [painel, setPainel] = useState<Painel>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [escolhendoContato, setEscolhendoContato] = useState(false);
  const campoRef = useRef<HTMLTextAreaElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const provider = conversa.channel_sessions?.provider ?? null;
  const apelido = conversa.contacts ? conversa.contacts.display_name : null;
  const contato = { name: conversa.contacts?.name ?? null, displayName: apelido };
  const nomeParaOModelo = nomeDoContato(conversa.contacts) ?? conversa.contacts?.phone_number ?? "";
  const fechada = conversa.status === "closed";
  const slash = useMemo(() => resolveSlash(texto), [texto]);

  // Trocar de conversa limpa o campo; a primeira rodada preserva o rascunho sugerido.
  const primeiraRodada = useRef(true);
  useEffect(() => {
    if (primeiraRodada.current) {
      primeiraRodada.current = false;
      return;
    }
    setTexto("");
    setPainel(null);
  }, [conversationId]);
  useEffect(() => {
    if (slash.open) setPainel("respostas");
    else if (painel === "respostas" && !texto.startsWith("/")) setPainel(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slash.open]);
  useEffect(() => {
    const el = campoRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, ALTURA_MAX)}px`;
  }, [texto]);

  const inserir = (trecho: string) => {
    const el = campoRef.current;
    const inicio = el?.selectionStart ?? texto.length;
    const fim = el?.selectionEnd ?? texto.length;
    setTexto(texto.slice(0, inicio) + trecho + texto.slice(fim));
    requestAnimationFrame(() => el?.focus());
  };
  const enviarTexto = () => {
    const body = texto.trim();
    if (!body || enviar.isPending) return;
    enviar.mutate(
      {
        conversation_id: conversationId,
        type: "text",
        body,
        ...(respondendo ? { reply_to_message_id: respondendo.id } : {}),
      },
      {
        onSuccess: () => {
          // Só limpa se o campo ainda é o que foi enviado: o que se digitou depois do Enter fica.
          setTexto((atual) => (atual.trim() === body ? "" : atual));
          aoCancelarResposta();
        },
      },
    );
  };
  const aoTeclar = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !slash.open) {
      e.preventDefault();
      enviarTexto();
    }
    if (e.key === "Escape") setPainel(null);
  };
  const enviarArquivo = async (file: File, legenda: string) => {
    try {
      const m = await upload.mutateAsync({ conversationId, file, destino: "mensagem" });
      enviar.mutate({
        conversation_id: conversationId,
        type: m.kind,
        media_storage_path: m.storage_path,
        media_mime: m.media_mime,
        media_size_bytes: m.media_size_bytes,
        ...(legenda ? { body: legenda } : {}),
      });
    } catch {
      toast.error(t("Não foi possível enviar o arquivo."));
    } finally {
      setArquivo(null);
    }
  };
  const aoCamera = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setArquivo(f);
    e.target.value = "";
  };
  const enviarContato = (c: ContactPickPayload) => {
    enviar.mutate(
      { conversation_id: conversationId, type: "contact", metadata: { contact: c } },
      { onSuccess: () => setEscolhendoContato(false) },
    );
  };

  if (bloqueio) {
    return (
      <div
        className="border-t border-casca-borda px-4 py-3 text-[12px] text-casca-suave"
        data-testid="compositor-bloqueado"
      >
        {bloqueio}
      </div>
    );
  }
  if (fechada) {
    return (
      <div
        className="border-t border-casca-borda px-4 py-3 text-center text-[12px] text-casca-suave"
        data-testid="compositor-fechado"
      >
        {t("Reabra o atendimento para responder.")}
      </div>
    );
  }

  const janelas = (
    <>
      <BalaoDoAssistente
        aberto={painel === "assistente"}
        aoFechar={() => setPainel(null)}
        conversationId={conversationId}
        contato={nomeParaOModelo}
        aoInserir={(s) => setTexto(s)}
      />
      <JanelaModelosDeMensagem
        aberta={painel === "modelos"}
        aoFechar={() => setPainel(null)}
        conversationId={conversationId}
        provider={provider}
        contato={contato}
      />
    </>
  );

  if (modo !== "livre") {
    return (
      <div className="relative">
        <FaixaAtribuirAMim conversa={conversa} />
        <AvisoForaDaJanela
          modo={modo}
          aoAbrirModelos={() => setPainel("modelos")}
          aoAbrirAssistente={() => setPainel("assistente")}
          aoAgendar={() => aoAgendar("")}
        />
        {janelas}
      </div>
    );
  }

  return (
    <div className="relative border-t border-casca-borda" data-testid="compositor-da-casca">
      <FaixaAtribuirAMim conversa={conversa} />
      {respondendo ? (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-casca-gatilho border-l-2 border-casca-marca bg-casca-busca px-3 py-1.5 text-[12px]">
          <span className="min-w-0 flex-1 truncate text-casca-suave">
            {respondendo.body ?? t("Mídia")}
          </span>
          <button
            type="button"
            aria-label={t("Cancelar resposta")}
            className="text-casca-suave"
            onClick={aoCancelarResposta}
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      ) : null}
      <div className={cn("px-4 pt-3 pb-2", compacto && "px-3 pt-2")}>
        <textarea
          ref={campoRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={aoTeclar}
          placeholder={t("Mensagem")}
          aria-label={t("Mensagem")}
          rows={1}
          className="min-h-[40px] w-full resize-none rounded-lg bg-casca-busca px-3 py-2.5 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
        />
        <div className="mt-1 flex items-center">
          <BarraDeIcones
            provider={provider}
            compacto={compacto}
            acoes={{
              assistente: {
                onClick: () => setPainel(painel === "assistente" ? null : "assistente"),
                ativo: painel === "assistente",
                title: NOME_DO_ASSISTENTE,
              },
              emoji: { elemento: <EmojiButton onPick={inserir} /> },
              anexo: {
                elemento: (
                  <AttachMenu
                    onPick={setArquivo}
                    onPickContact={() => setEscolhendoContato(true)}
                  />
                ),
              },
              camera: { onClick: () => cameraRef.current?.click() },
              audio: { elemento: <AudioRecorder conversationId={conversationId} /> },
              respostas: {
                onClick: () => setPainel(painel === "respostas" ? null : "respostas"),
                ativo: painel === "respostas",
              },
              modelos: { onClick: () => setPainel("modelos") },
              nota: { onClick: () => setPainel("nota") },
              agendar: { onClick: () => aoAgendar(texto) },
            }}
          />
          <span className="flex-1" />
          <button
            type="button"
            className={cn(BOTAO_DO_ICONE, "text-casca-marca")}
            aria-label={t("Enviar")}
            title={t("Enviar")}
            disabled={!texto.trim() || enviar.isPending}
            onClick={enviarTexto}
          >
            <Send size={16} aria-hidden />
          </button>
        </div>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={aoCamera}
        aria-hidden
        tabIndex={-1}
      />
      <PainelRespostasRapidas
        conversationId={conversationId}
        aberto={painel === "respostas"}
        aoFechar={() => setPainel(null)}
        termoInicial={slash.open ? slash.query : ""}
        contato={contato}
        aoEscolher={(s) => {
          setTexto(s);
          setPainel(null);
          requestAnimationFrame(() => campoRef.current?.focus());
        }}
      />
      <JanelaNotaInterna
        aberta={painel === "nota"}
        aoFechar={() => setPainel(null)}
        conversationId={conversationId}
      />
      {janelas}
      <AttachmentPreviewDialog
        file={arquivo}
        sending={upload.isPending || enviar.isPending}
        onCancel={() => setArquivo(null)}
        onSend={(legenda) => arquivo && void enviarArquivo(arquivo, legenda)}
      />
      <ContactPickerDialog
        open={escolhendoContato}
        onOpenChange={setEscolhendoContato}
        excludeContactId={conversa.contact_id}
        sending={enviar.isPending}
        onPick={enviarContato}
      />
    </div>
  );
}
