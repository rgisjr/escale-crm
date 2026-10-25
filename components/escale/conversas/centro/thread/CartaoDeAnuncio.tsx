"use client";
import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import { ExternalLink } from "@/lib/ui/icons-da-casca";

export interface AnuncioDaMensagem {
  headline?: string | null;
  body?: string | null;
  source_url?: string | null;
  image_url?: string | null;
}

/** Lê `message.metadata.referral` (o objeto da Meta que `extrairAtribuicaoMeta` já conhece). */
export function anuncioDaMensagem(
  metadata: Record<string, unknown> | null | undefined,
): AnuncioDaMensagem | null {
  const r = metadata?.referral;
  if (!r || typeof r !== "object") return null;
  const a = r as AnuncioDaMensagem;
  return a.headline || a.body || a.source_url ? a : null;
}

const CORPO_CURTO = 120;

/** O cartão "Anúncio" acima da primeira mensagem vinda de um clique em anúncio (c02): imagem, título, texto com "Ler mais", "Ver anúncio". */
export function CartaoDeAnuncio({ anuncio }: { anuncio: AnuncioDaMensagem }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const corpo = anuncio.body ?? "";
  const longo = corpo.length > CORPO_CURTO;
  return (
    <div
      className="mb-2 overflow-hidden rounded-lg border border-casca-borda bg-white"
      data-testid="cartao-de-anuncio"
    >
      {anuncio.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={anuncio.image_url} alt="" className="h-28 w-full object-cover" />
      ) : null}
      <div className="px-3 py-2">
        <div className="text-[11px] font-semibold tracking-wide text-casca-sobrelinha uppercase">
          {t("Anúncio")}
        </div>
        {anuncio.headline ? (
          <div className="text-[15px] font-semibold text-casca-texto">{anuncio.headline}</div>
        ) : null}
        {corpo ? (
          <p className="text-[14px] text-casca-suave">
            {aberto || !longo ? corpo : `${corpo.slice(0, CORPO_CURTO)}… `}
            {longo && !aberto ? (
              <button
                type="button"
                className="font-medium text-casca-marca"
                onClick={() => setAberto(true)}
              >
                {t("Ler mais")}
              </button>
            ) : null}
          </p>
        ) : null}
        {anuncio.source_url ? (
          <a
            href={anuncio.source_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[14px] font-medium text-casca-marca"
          >
            {t("Ver anúncio")}
            <ExternalLink size={12} aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}
