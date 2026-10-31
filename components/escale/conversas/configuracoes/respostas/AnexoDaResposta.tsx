"use client";
import { useRef, useState } from "react";

import { useAtivosDeMidia, useSubirAtivo } from "@/hooks/escale/useAtivosDeMidia";
import { useT } from "@/hooks/i18n/useT";
import { chaveDoNumero, rotuloDoAnexo } from "@/lib/escale/conversas/anexo-da-resposta";
import type { TipoDeMidia } from "@/lib/midia/ativos";
import { FileImage, FileText, FileVideo, Music, Paperclip, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const ICONE_DO_TIPO: Record<TipoDeMidia, typeof FileText> = {
  audio: Music,
  image: FileImage,
  video: FileVideo,
  document: FileText,
};
const ACEITA = "audio/ogg,image/jpeg,image/png,image/webp,video/mp4,application/pdf";

export interface ValorDoAnexo {
  asset: string;
}

/**
 * O clipe da janela "Criar/Editar Resposta rápida": escolhe o arquivo que sai junto com a resposta.
 * O arquivo vem da biblioteca da organização (pode subir um novo aqui) ou é "o arquivo do número" —
 * uma chave que cada número do WhatsApp preenche com o seu (ex.: o áudio de boas-vindas de cada loja).
 */
export function BotaoDeAnexo({
  valor,
  aoMudar,
}: {
  valor: ValorDoAnexo | null;
  aoMudar: (v: ValorDoAnexo | null) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [chave, setChave] = useState("");
  const entradaRef = useRef<HTMLInputElement | null>(null);
  const { data: ativos = [], isLoading } = useAtivosDeMidia(aberto);
  const subir = useSubirAtivo();
  const chaveValida = chaveDoNumero(chave);

  const escolher = (asset: string) => {
    aoMudar({ asset });
    setAberto(false);
  };
  const aoArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    const ativo = await subir.mutateAsync(arquivo).catch(() => null);
    if (ativo) escolher(ativo.id);
  };

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={t("Anexar arquivo")}
        title={t("Anexar arquivo")}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className={cn(
          "grid size-7 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia",
          (aberto || valor) && "bg-casca-marca-suave text-casca-marca",
        )}
      >
        <Paperclip size={16} aria-hidden />
      </button>
      {aberto ? (
        <div
          role="dialog"
          aria-label={t("Anexar arquivo")}
          className="absolute top-full left-0 z-30 mt-2 w-[320px] rounded-casca-gatilho border border-casca-borda bg-white shadow-casca-painel"
        >
          <div className="max-h-[180px] overflow-y-auto py-1">
            {isLoading ? (
              <p className="px-3 py-2 text-[13px] text-casca-suave">{t("Carregando…")}</p>
            ) : ativos.length === 0 ? (
              <p className="px-3 py-2 text-[13px] text-casca-suave">
                {t("Nenhum arquivo na biblioteca ainda.")}
              </p>
            ) : (
              ativos.map((a) => {
                const Icone = ICONE_DO_TIPO[a.tipo];
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => escolher(a.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-casca-texto hover:bg-casca-raia",
                      valor?.asset === a.id && "bg-casca-marca-suave",
                    )}
                  >
                    <Icone size={14} aria-hidden className="shrink-0 text-casca-suave" />
                    <span className="min-w-0 flex-1 truncate">{a.nome}</span>
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t border-casca-borda p-2">
            <button
              type="button"
              disabled={subir.isPending}
              onClick={() => entradaRef.current?.click()}
              className="h-8 w-full rounded-casca-gatilho bg-casca-raia text-[13px] text-casca-texto hover:bg-casca-busca disabled:opacity-50"
            >
              {subir.isPending ? t("Enviando…") : t("Enviar arquivo do computador")}
            </button>
            <input
              ref={entradaRef}
              type="file"
              accept={ACEITA}
              className="hidden"
              aria-hidden
              tabIndex={-1}
              onChange={(e) => {
                void aoArquivo(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <p className="mt-1 text-[12px] text-casca-meta">
              {t("Áudio .ogg, imagem, vídeo MP4 ou PDF, até 16 MB.")}
            </p>
          </div>
          <div className="border-t border-casca-borda p-2">
            <label className="flex flex-col gap-1 text-[12px] text-casca-suave">
              {t("Ou um arquivo que muda por número")}
              <span className="flex gap-1">
                <input
                  value={chave}
                  onChange={(e) => setChave(e.target.value)}
                  placeholder={t("Nome (ex.: boas_vindas)")}
                  maxLength={40}
                  className="h-8 min-w-0 flex-1 rounded-casca-gatilho bg-casca-busca px-2 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
                />
                <button
                  type="button"
                  disabled={!chaveValida}
                  onClick={() => chaveValida && escolher(`var:${chaveValida}`)}
                  className="h-8 rounded-casca-gatilho bg-casca-marca px-3 text-[13px] text-white disabled:opacity-50"
                >
                  {t("Usar")}
                </button>
              </span>
            </label>
          </div>
        </div>
      ) : null}
    </span>
  );
}

/** O anexo escolhido, com o X para tirar. Fica logo abaixo do texto da resposta. */
export function FaixaDoAnexo({
  valor,
  aoTirar,
}: {
  valor: ValorDoAnexo;
  aoTirar: () => void;
}) {
  const t = useT();
  const { data: ativos = [] } = useAtivosDeMidia();
  const rotulo = rotuloDoAnexo(valor.asset, ativos);
  const Icone = rotulo.tipo ? ICONE_DO_TIPO[rotulo.tipo] : Paperclip;
  const descricao =
    rotulo.origem === "numero"
      ? `${t("Arquivo do número")}: ${rotulo.nome}`
      : rotulo.origem === "removido"
        ? t("Arquivo removido da biblioteca")
        : rotulo.nome;
  return (
    <div
      className="flex items-center gap-2 border-t border-casca-borda px-3 py-1.5 text-[13px] text-casca-texto"
      data-testid="anexo-da-resposta"
    >
      <Icone size={14} aria-hidden className="shrink-0 text-casca-suave" />
      <span className={cn("min-w-0 flex-1 truncate", rotulo.origem === "removido" && "text-casca-pausa-texto")}>
        {descricao}
      </span>
      <button
        type="button"
        aria-label={t("Tirar anexo")}
        title={t("Tirar anexo")}
        onClick={aoTirar}
        className="grid size-5 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
      >
        <X size={12} aria-hidden />
      </button>
    </div>
  );
}
