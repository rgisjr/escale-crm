"use client";
import { useT } from "@/hooks/i18n/useT";
import type { PublicacaoDaCaixa } from "@/lib/escale/comentarios/caixa";
import type { PlataformaDeComentario } from "@/lib/escale/comentarios/constantes";
import { NOME_DA_REDE, quandoBr } from "@/lib/escale/comentarios/formato";
import { ExternalLink, ImageIcon, RefreshCw } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** FORK ESCALE · Fase 10A (4.3): o cabeçalho do centro — a publicação, os números e "Ver no Instagram/Facebook". */
export function CabecalhoDaPublicacao({
  publicacao,
  plataforma,
  semResposta,
  atualizando,
  aoAtualizar,
}: {
  publicacao: PublicacaoDaCaixa;
  plataforma: PlataformaDeComentario;
  /** O número a mostrar (o do Zernio, ou o contado nos comentários carregados). */
  semResposta: number;
  atualizando: boolean;
  aoAtualizar: () => void;
}) {
  const t = useT();
  const publicada = quandoBr(publicacao.publicadaEm);
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-casca-borda px-6">
      {publicacao.miniatura ? (
        <img src={publicacao.miniatura} alt="" className="size-10 shrink-0 rounded-md object-cover" />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-casca-raia text-casca-meta">
          <ImageIcon size={18} aria-hidden />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn("line-clamp-1 text-base font-semibold text-casca-texto", !publicacao.legenda && "text-casca-meta italic")}>
          {publicacao.legenda ?? t("Sem legenda")}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-casca-meta">
          {publicada ? <span>{t("Publicada em {data}").replace("{data}", publicada)}</span> : null}
          {publicacao.comentarios !== null ? (
            <span>· {t("{n} comentários").replace("{n}", publicacao.comentarios.toLocaleString("pt-BR"))}</span>
          ) : null}
          <span className={cn(semResposta > 0 && "text-casca-marca")}>
            · {t("{n} sem resposta").replace("{n}", semResposta.toLocaleString("pt-BR"))}
          </span>
        </span>
      </div>
      {publicacao.link ? (
        <a
          href={publicacao.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-[13px] text-casca-marca-forte hover:underline"
        >
          {plataforma === "instagram" ? t("Ver no Instagram") : t("Ver no Facebook")}
          <ExternalLink size={14} aria-hidden />
          <span className="sr-only">{NOME_DA_REDE[plataforma]}</span>
        </a>
      ) : null}
      <button
        type="button"
        aria-label={t("Atualizar")}
        title={t("Atualizar")}
        onClick={aoAtualizar}
        className="grid size-8 shrink-0 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
      >
        <RefreshCw size={16} aria-hidden className={cn(atualizando && "animate-spin")} />
      </button>
    </header>
  );
}
