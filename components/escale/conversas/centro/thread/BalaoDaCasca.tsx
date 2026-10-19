"use client";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";

import { MediaRenderer } from "@/components/inbox/media/MediaRenderer";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { useT } from "@/hooks/i18n/useT";
import type { Message } from "@/lib/types/messaging";
import { Check, CheckCheck, ChevronDown, RotateCcw } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CartaoDeAnuncio, anuncioDaMensagem } from "./CartaoDeAnuncio";

const EDICAO_MAX_MS = 15 * 60_000;
const ITEM =
  "flex h-8 w-full items-center px-3 text-left text-[12px] text-casca-texto hover:bg-casca-raia";
const hora = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function Ack({ status, t }: { status: string; t: (s: string) => string }) {
  if (status === "read")
    return <CheckCheck size={12} aria-label={t("Lida")} className="text-casca-novo" />;
  if (status === "delivered")
    return <CheckCheck size={12} aria-label={t("Entregue")} className="text-casca-meta" />;
  if (status === "sent")
    return <Check size={12} aria-label={t("Enviada")} className="text-casca-meta" />;
  return null;
}

/** Destaca o termo da busca no texto (a busca "nesta conversa" do cabeçalho). */
function Realce({ texto, termo }: { texto: string; termo: string }) {
  if (!termo.trim()) return <>{texto}</>;
  const partes = texto.split(new RegExp(`(${termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return (
    <>
      {partes.map((p, i) =>
        p.toLowerCase() === termo.toLowerCase() ? (
          <mark key={i} className="rounded bg-casca-atencao/40">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export interface AcoesDaBolha {
  aoResponder: (m: Message) => void;
  aoEditar: (m: Message, texto: string) => void;
  aoApagarParaTodos: (m: Message) => void;
  aoApagarParaMim: (m: Message) => void;
  aoRestaurar: (m: Message) => void;
  aoReenviar: (m: Message) => void;
}

/**
 * A BOLHA DA CLINT (c02, c56, c59; C4; N14): entrada branca à esquerda, saída
 * `casca-caixa-msg` à direita; "Editada"/"Encaminhada" antes da hora; o menu ⌄
 * no hover com Responder, Editar (15 min, texto nosso), Apagar para mim
 * (ocultar), Apagar para todos (revogar). A mídia é o `MediaRenderer` do
 * original; a transcrição do áudio aparece abaixo dele.
 */
export function BalaoDaCasca({
  message,
  viewerUserId,
  nomes,
  searchTerm,
  agora,
  aoResponder,
  aoEditar,
  aoApagarParaTodos,
  aoApagarParaMim,
  aoRestaurar,
  aoReenviar,
}: {
  message: Message;
  viewerUserId: string | null;
  nomes: ReadonlyMap<string, string>;
  searchTerm: string;
  agora: number;
} & AcoesDaBolha) {
  const t = useT();
  const [menu, setMenu] = useState(false);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(message.body ?? "");
  const saida = message.direction === "outbound";
  const oculta = !!(message.metadata as { crm_hidden_at?: string } | null)?.crm_hidden_at;
  const revogada = !!message.revoked_at;
  const falhou = message.status === "failed";
  const anuncio = !saida ? anuncioDaMensagem(message.metadata) : null;
  const encaminhada =
    message.metadata?.forwarded === true || message.metadata?.is_forwarded === true;
  const minha = saida && message.sent_by_user_id === viewerUserId;
  const podeEditar =
    minha &&
    message.type === "text" &&
    !revogada &&
    agora - Date.parse(message.sent_at) <= EDICAO_MAX_MS;
  const autor = saida
    ? message.sent_by_user_id
      ? (nomes.get(message.sent_by_user_id) ?? t("Atendente"))
      : message.sent_via === "ai" || message.sent_via === "automation"
        ? t("Automação")
        : null
    : null;
  const temMidia = !!message.media_url || !!message.media_storage_path;

  return (
    <div
      className={cn("my-1 flex", saida ? "justify-end" : "justify-start")}
      data-testid={`item-message-${message.id}`}
    >
      <div className="max-w-[65%]">
        {anuncio ? <CartaoDeAnuncio anuncio={anuncio} /> : null}
        <div
          className={cn(
            "group relative rounded-lg border px-3 py-2 text-[13px] text-casca-texto",
            saida
              ? "rounded-tr-none border-casca-borda-msg bg-casca-caixa-msg"
              : "rounded-tl-none border-casca-borda bg-white",
            oculta && "opacity-50",
          )}
        >
          {autor ? (
            <div className="mb-0.5 text-[11px] font-medium text-casca-marca">{autor}</div>
          ) : null}
          {revogada ? (
            <p className="text-casca-suave italic">{t("Esta mensagem foi apagada")}</p>
          ) : (
            <>
              {temMidia ? <MediaRenderer message={message} agora={agora} /> : null}
              {message.media_derived_text ? (
                <p className="mt-1 text-[12px] text-casca-suave italic">
                  {message.media_derived_text}
                </p>
              ) : null}
              {editando ? (
                <div className="flex flex-col gap-1">
                  <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    className="min-h-[60px] rounded border border-casca-borda p-1 text-[13px]"
                    aria-label={t("Editar mensagem")}
                  />
                  <div className="flex justify-end gap-2 text-[12px]">
                    <button
                      type="button"
                      onClick={() => {
                        setEditando(false);
                        setTexto(message.body ?? "");
                      }}
                    >
                      {t("Cancelar")}
                    </button>
                    <button
                      type="button"
                      className="font-medium text-casca-marca"
                      onClick={() => {
                        setEditando(false);
                        aoEditar(message, texto);
                      }}
                    >
                      {t("Salvar")}
                    </button>
                  </div>
                </div>
              ) : message.body && message.type !== "template" ? (
                <p className="break-words whitespace-pre-wrap">
                  <Realce texto={message.body} termo={searchTerm} />
                </p>
              ) : message.body ? (
                <p className="break-words whitespace-pre-wrap">{message.body}</p>
              ) : null}
            </>
          )}
          <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-casca-meta">
            {message.edited_at ? <span className="italic">{t("Editada")}</span> : null}
            {encaminhada ? <span className="italic">{t("Encaminhada")}</span> : null}
            <span>{hora(message.sent_at)}</span>
            {saida && !falhou ? <Ack status={message.status} t={t} /> : null}
          </div>
          {!revogada ? (
            <Popover.Root open={menu} onOpenChange={setMenu}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  aria-label={t("Opções da mensagem")}
                  className="absolute top-1 right-1 grid size-6 place-items-center rounded text-casca-chevron opacity-0 group-hover:opacity-100 hover:bg-casca-raia focus:opacity-100 data-[state=open]:opacity-100"
                >
                  <ChevronDown size={14} aria-hidden />
                </button>
              </Popover.Trigger>
              <PainelSuspenso align="end" className="w-[170px] py-1">
                <button
                  type="button"
                  className={ITEM}
                  onClick={() => {
                    setMenu(false);
                    aoResponder(message);
                  }}
                >
                  {t("Responder")}
                </button>
                {podeEditar ? (
                  <button
                    type="button"
                    className={ITEM}
                    onClick={() => {
                      setMenu(false);
                      setEditando(true);
                    }}
                  >
                    {t("Editar")}
                  </button>
                ) : null}
                {oculta ? (
                  <button
                    type="button"
                    className={ITEM}
                    onClick={() => {
                      setMenu(false);
                      aoRestaurar(message);
                    }}
                  >
                    {t("Restaurar")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={ITEM}
                    onClick={() => {
                      setMenu(false);
                      aoApagarParaMim(message);
                    }}
                  >
                    {t("Apagar para mim")}
                  </button>
                )}
                {minha ? (
                  <button
                    type="button"
                    className={cn(ITEM, "text-casca-alerta")}
                    onClick={() => {
                      setMenu(false);
                      aoApagarParaTodos(message);
                    }}
                  >
                    {t("Apagar para todos")}
                  </button>
                ) : null}
              </PainelSuspenso>
            </Popover.Root>
          ) : null}
        </div>
        {falhou ? (
          <div className="mt-1 flex items-center justify-end gap-2 text-[11px] text-casca-alerta">
            <span>{message.error_message ?? t("Não foi possível enviar")}</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 font-medium"
              onClick={() => aoReenviar(message)}
            >
              <RotateCcw size={12} aria-hidden />
              {t("Reenviar")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
