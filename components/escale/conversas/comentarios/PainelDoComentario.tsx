"use client";
import Link from "next/link";
import type { ReactNode } from "react";

import type { ContaParaACaixa } from "@/hooks/escale/useComentarios";
import { useT } from "@/hooks/i18n/useT";
import { EXPLICACAO_DO_DIRECT, type ComentarioDaCaixa, type PublicacaoDaCaixa } from "@/lib/escale/comentarios/caixa";
import { NOME_DA_REDE, limiteDoDirect, quandoBr } from "@/lib/escale/comentarios/formato";
import { corDoAvatar, inicialDoNome } from "@/lib/escale/quadro/aparencia";
import { ExternalLink, ImageIcon } from "@/lib/ui/icons-da-casca";

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-b border-casca-borda px-5 py-4">
      <h3 className="mb-2 text-[13px] font-semibold text-casca-texto">{titulo}</h3>
      {children}
    </section>
  );
}

function DaPublicacao({ publicacao, conta }: { publicacao: PublicacaoDaCaixa; conta: ContaParaACaixa }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-3 p-5">
      {publicacao.miniatura ? (
        <img src={publicacao.miniatura} alt="" className="w-full rounded-lg object-cover" />
      ) : (
        <span className="grid h-40 w-full place-items-center rounded-lg bg-casca-raia text-casca-meta">
          <ImageIcon size={32} aria-hidden />
        </span>
      )}
      <p className="text-[14px] break-words whitespace-pre-wrap text-casca-texto">{publicacao.legenda ?? t("Sem legenda")}</p>
      {publicacao.publicadaEm ? (
        <p className="text-[12px] text-casca-meta">
          {t("Publicada em {data}").replace("{data}", quandoBr(publicacao.publicadaEm))}
        </p>
      ) : null}
      {publicacao.link ? (
        <a
          href={publicacao.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[13px] text-casca-marca-forte hover:underline"
        >
          {conta.plataforma === "instagram" ? t("Ver no Instagram") : t("Ver no Facebook")}
          <ExternalLink size={14} aria-hidden />
        </a>
      ) : null}
    </div>
  );
}

/**
 * FORK ESCALE · Fase 10A (4.6): o painel da direita da caixa. Sem comentário escolhido mostra a
 * publicação; com ele, quem comentou (e a ficha, se já é contato), o comentário e o estado do direct.
 */
export function PainelDoComentario({
  conta,
  publicacao,
  comentario,
}: {
  conta: ContaParaACaixa;
  publicacao: PublicacaoDaCaixa | null;
  comentario: ComentarioDaCaixa | null;
}) {
  const t = useT();
  if (!comentario) {
    return (
      <aside className="hidden w-full flex-col overflow-y-auto border-l border-casca-borda bg-white xl:flex">
        {publicacao ? <DaPublicacao publicacao={publicacao} conta={conta} /> : null}
      </aside>
    );
  }
  const { autor } = comentario;
  const usuario = autor.usuario ? `@${autor.usuario}` : (autor.nome ?? "");
  const direct = comentario.direct;
  const limite = limiteDoDirect(comentario.comentadoEm);
  return (
    <aside className="hidden w-full flex-col overflow-y-auto border-l border-casca-borda bg-white xl:flex">
      <Secao titulo={t("Quem comentou")}>
        <div className="flex items-center gap-3">
          {autor.foto ? (
            <img src={autor.foto} alt="" className="size-12 rounded-full object-cover" />
          ) : (
            <span
              aria-hidden
              className="grid size-12 place-items-center rounded-full text-[18px] font-medium text-white"
              style={{ backgroundColor: corDoAvatar(autor.id) }}
            >
              {inicialDoNome(autor.nome ?? autor.usuario)}
            </span>
          )}
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[14px] font-semibold text-casca-texto">{usuario}</span>
            {autor.usuario && autor.nome ? <span className="truncate text-[13px] text-casca-meta">{autor.nome}</span> : null}
            <span className="text-[12px] text-casca-meta">{NOME_DA_REDE[conta.plataforma]}</span>
          </div>
        </div>
        {autor.daPropriaConta ? null : comentario.contato ? (
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="truncate text-[14px] font-semibold text-casca-texto">{comentario.contato.nome}</span>
            <Link href={`/app/contacts/${comentario.contato.id}`} className="shrink-0 text-[13px] text-casca-marca-forte hover:underline">
              {t("Abrir ficha")}
            </Link>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-[13px] text-casca-meta">{t("Ainda não é contato")}</p>
            <p className="mt-0.5 text-[11px] text-casca-suave">
              {t("Vira contato quando receber um direct pela caixa ou por uma automação.")}
            </p>
          </div>
        )}
      </Secao>
      <Secao titulo={t("Comentário")}>
        <p className="text-[14px] break-words whitespace-pre-wrap text-casca-texto">{comentario.texto}</p>
        <p className="mt-2 text-[12px] text-casca-meta">{quandoBr(comentario.comentadoEm)}</p>
        <p className="mt-1 text-[12px] text-casca-suave">
          {autor.daPropriaConta ? t("Você") : comentario.respondido ? t("Respondido") : t("Sem resposta")}
          {comentario.oculto ? ` · ${t("Oculto")}` : ""}
        </p>
      </Secao>
      {autor.daPropriaConta ? null : (
        <Secao titulo={t("Mandar direct")}>
          <p className="text-[13px] text-casca-suave">
            {direct.liberado
              ? t("Pode receber um direct até {data}").replace("{data}", limite)
              : t(EXPLICACAO_DO_DIRECT[direct.motivo])}
          </p>
        </Secao>
      )}
    </aside>
  );
}
