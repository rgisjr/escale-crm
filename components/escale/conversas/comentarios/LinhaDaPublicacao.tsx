"use client";
import { useT } from "@/hooks/i18n/useT";
import type { PublicacaoDaCaixa } from "@/lib/escale/comentarios/caixa";
import type { PlataformaDeComentario } from "@/lib/escale/comentarios/constantes";
import { horaDaLinha } from "@/lib/escale/conversas/linha";
import { FacebookLogo, ImageIcon, InstagramLogo } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** O selo da rede no canto da miniatura (o mesmo gesto do selo do canal na foto da conversa). */
export function SeloDaRede({ plataforma, tamanho = 16 }: { plataforma: PlataformaDeComentario; tamanho?: number }) {
  const Logo = plataforma === "instagram" ? InstagramLogo : FacebookLogo;
  const cor = plataforma === "instagram" ? "text-[#c13584]" : "text-[#0866ff]";
  return (
    <span className={cn("grid place-items-center rounded-full bg-white p-px", cor)}>
      <Logo size={tamanho} weight="fill" aria-hidden />
    </span>
  );
}

/**
 * FORK ESCALE · Fase 10A (4.2): a linha da lista de publicações. Molde da `LinhaDaFila`: miniatura
 * 56×56 com o selo da rede, legenda em 1 linha, "{n} comentários" e a hora do último comentário; o
 * contador roxo só aparece quando o Zernio informa quantos estão sem resposta.
 */
export function LinhaDaPublicacao({
  publicacao,
  plataforma,
  selecionada,
  aoSelecionar,
  agora,
}: {
  publicacao: PublicacaoDaCaixa;
  plataforma: PlataformaDeComentario;
  selecionada: boolean;
  aoSelecionar: (id: string) => void;
  agora: Date;
}) {
  const t = useT();
  const total = publicacao.comentarios;
  return (
    <button
      type="button"
      aria-pressed={selecionada}
      onClick={() => aoSelecionar(publicacao.id)}
      className={cn(
        "flex h-[88px] w-full shrink-0 items-center gap-3 border-b border-casca-borda px-4 py-3 text-left hover:bg-casca-raia",
        selecionada && "bg-casca-marca-suave hover:bg-casca-marca-suave",
      )}
    >
      <span className="relative shrink-0">
        {publicacao.miniatura ? (
          <img src={publicacao.miniatura} alt="" className="size-14 rounded-lg object-cover" />
        ) : (
          <span className="grid size-14 place-items-center rounded-lg bg-casca-raia text-casca-meta">
            <ImageIcon size={24} aria-hidden />
          </span>
        )}
        <span className="absolute -right-1 -bottom-1">
          <SeloDaRede plataforma={plataforma} />
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        {publicacao.legenda ? (
          <span className="line-clamp-1 text-[15px] font-semibold text-casca-texto">{publicacao.legenda}</span>
        ) : (
          <span className="line-clamp-1 text-[15px] font-semibold text-casca-meta italic">{t("Sem legenda")}</span>
        )}
        <span className="text-[14px] text-casca-suave">
          {total === null ? "" : t("{n} comentários").replace("{n}", total.toLocaleString("pt-BR"))}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5 self-start pt-0.5">
        <span className="text-[12px] text-casca-meta">
          {horaDaLinha(publicacao.ultimoComentarioEm ?? publicacao.publicadaEm, agora, t)}
        </span>
        {publicacao.semResposta !== null && publicacao.semResposta > 0 ? (
          <span
            title={t("{n} sem resposta").replace("{n}", String(publicacao.semResposta))}
            className="grid min-w-5 place-items-center rounded-full bg-casca-marca px-1.5 text-[11px] leading-5 font-medium text-white"
          >
            {publicacao.semResposta.toLocaleString("pt-BR")}
          </span>
        ) : null}
      </span>
    </button>
  );
}
