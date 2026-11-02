"use client";
import { useState } from "react";

import { useComentariosDoContato } from "@/hooks/escale/useComentariosDoContato";
import { useT } from "@/hooks/i18n/useT";
import type { ComentarioDoContato } from "@/lib/escale/comentarios/origem";
import { dataHoraBr } from "@/lib/escale/negocio/arquivos";
import { ExternalLink, FacebookLogo, InstagramLogo } from "@/lib/ui/icons-da-casca";

/**
 * FORK ESCALE · Fase 10C: a linha "Origem" da aba Contato — de que publicação e de que automação a
 * pessoa veio. Molde provisório (a Clint não tem): a linha "Tags" da aba, sem cor nova.
 */
const SEM_SEGUNDOS = 16;
const quando = (iso: string): string => dataHoraBr(iso).slice(0, SEM_SEGUNDOS);

function Plataforma({ item }: { item: ComentarioDoContato }) {
  const Logo = item.plataforma === "instagram" ? InstagramLogo : FacebookLogo;
  return <Logo size={14} aria-hidden className="shrink-0" />;
}

function Publicacao({ item }: { item: ComentarioDoContato }) {
  const t = useT();
  const { legenda, link } = item.publicacao;
  const texto = legenda ?? t("Sem legenda");
  if (!link) return <span className="min-w-0 max-w-[320px] truncate">{texto}</span>;
  const dica =
    item.plataforma === "instagram" ? t("Abrir a publicação no Instagram") : t("Abrir a publicação no Facebook");
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title={dica}
      className="inline-flex min-w-0 items-center gap-1 text-casca-marca-forte hover:underline"
    >
      <span className="max-w-[320px] truncate">{texto}</span>
      <ExternalLink size={12} aria-hidden />
    </a>
  );
}

function ItemDaLista({ item }: { item: ComentarioDoContato }) {
  const t = useT();
  return (
    <li className="flex gap-3 rounded-lg bg-casca-raia px-3 py-2">
      {item.publicacao.miniatura ? (
        // eslint-disable-next-line @next/next/no-img-element -- miniatura do CDN da Meta (host variável)
        <img src={item.publicacao.miniatura} alt="" className="size-8 shrink-0 rounded-md object-cover" />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface">
          <Plataforma item={item} />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-0.5 text-[13px] text-casca-texto">
        <div className="flex min-w-0 items-center gap-2">
          <Publicacao item={item} />
          {item.repetido ? (
            <span
              title={t("A pessoa já tinha recebido esta automação.")}
              className="rounded bg-casca-raia px-1.5 text-[10px] text-casca-texto-2"
            >
              {t("Repetido")}
            </span>
          ) : null}
        </div>
        {item.texto ? <span className="line-clamp-2 text-[12px] italic text-casca-texto-2">{`“${item.texto}”`}</span> : null}
        <span className="text-[11px] text-casca-suave">
          {`${item.automacao.nome || t("Automação")} · ${quando(item.comentadoEm)}`}
        </span>
      </div>
    </li>
  );
}

export function OrigemDoComentario({ contatoId }: { contatoId: string }) {
  const t = useT();
  const { data, isError, refetch } = useComentariosDoContato(contatoId);
  const [aberta, setAberta] = useState(false);

  if (isError) {
    return (
      <div role="alert" className="mb-4 flex items-center gap-2 text-[12px] text-casca-texto-2">
        <span>{t("Não foi possível carregar os comentários.")}</span>
        <button type="button" onClick={() => void refetch()} className="text-casca-marca-forte hover:underline">
          {t("Tentar de novo")}
        </button>
      </div>
    );
  }
  const origem = data?.origem;
  if (!data || !origem) return null;

  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="text-[13px] text-casca-suave">{t("Origem")}</span>
      <div className="flex min-w-0 flex-col gap-1 text-[13px] text-casca-texto">
        <div className="flex min-w-0 items-center gap-1.5">
          <Plataforma item={origem} />
          <span>{t("Comentário em")}</span>
          <Publicacao item={origem} />
          <span className="text-casca-texto-2">{`· ${origem.automacao.nome || t("Automação")}`}</span>
        </div>
        <span className="text-[12px] text-casca-suave">{quando(origem.comentadoEm)}</span>
        {origem.texto ? (
          <span className="line-clamp-2 text-[12px] italic text-casca-texto-2">{`“${origem.texto}”`}</span>
        ) : null}
        {data.total > 1 ? (
          <>
            <button
              type="button"
              aria-expanded={aberta}
              onClick={() => setAberta((v) => !v)}
              className="self-start text-[12px] text-casca-marca-forte hover:underline"
            >
              {aberta ? t("Ocultar comentários") : t("Ver os {n} comentários").replace("{n}", String(data.total))}
            </button>
            {aberta ? (
              <>
                <ul className="mt-1 flex flex-col gap-2">
                  {data.recentes.map((item) => (
                    <ItemDaLista key={item.id} item={item} />
                  ))}
                </ul>
                {data.total > data.recentes.length ? (
                  <span className="text-[11px] text-casca-suave">
                    {t("Mostrando os 10 mais recentes de {total}.").replace(
                      "{total}",
                      data.total.toLocaleString("pt-BR"),
                    )}
                  </span>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
