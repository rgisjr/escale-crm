"use client";
import { useT } from "@/hooks/i18n/useT";
import type { CaminhoDoGatilho, FiltroDoCaminho } from "@/lib/escale/comentarios/schema";
import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { Trash2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { FiltroDePalavras } from "./FiltroDePalavras";
import { RespostaAoComentario } from "./RespostaAoComentario";

/**
 * O CARTÃO DO CAMINHO (fork Escale, Fase 10B): a publicação (em "Posts específicos"), o filtro de
 * comentário e a resposta pública. Provisório: sem print da Clint, molde pelos textos dela.
 */
export function CaminhoDoComentario({
  caminho,
  titulo,
  plataforma,
  aoMudar,
  aoRemover,
}: {
  caminho: CaminhoDoGatilho;
  /** FORK ESCALE · Fase 10D: "Curtir o comentário" só aparece no Facebook. */
  plataforma?: string;
  /** Só em "Posts específicos"; em "Todos os posts" o cartão não tem cabeçalho de publicação. */
  titulo?: { rotulo: string; miniaturas: readonly (string | null)[]; remover: string };
  aoMudar: (caminho: CaminhoDoGatilho) => void;
  aoRemover?: () => void;
}) {
  const t = useT();
  const { filtro } = caminho;
  const mudarFiltro = (f: FiltroDoCaminho) => aoMudar({ ...caminho, filtro: f });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-casca-divisoria p-4" data-testid={`caminho-${caminho.id}`}>
      {titulo ? (
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {titulo.miniaturas.slice(0, 3).map((url, i) =>
              url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" className="size-10 rounded-md border border-surface object-cover" />
              ) : (
                <span key={i} className="size-10 rounded-md border border-surface bg-casca-raia" aria-hidden />
              ),
            )}
          </div>
          <p className="line-clamp-2 min-w-0 flex-1 text-[12px] text-casca-texto">{titulo.rotulo}</p>
          {aoRemover ? (
            <button
              type="button"
              aria-label={titulo.remover}
              onClick={aoRemover}
              className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
            >
              <Trash2 size={14} aria-hidden />
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-[13px] font-medium text-casca-texto">{t("Qualquer publicação")}</p>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-[12px] font-semibold text-casca-texto">{t("Filtro de comentário")}</p>
        <div className="flex gap-2" role="group" aria-label={t("Filtro de comentário")}>
          {(["qualquer", "palavras"] as const).map((modo) => (
            <button
              key={modo}
              type="button"
              aria-pressed={filtro.modo === modo}
              onClick={() =>
                filtro.modo !== modo &&
                mudarFiltro(
                  modo === "qualquer"
                    ? { modo: "qualquer" }
                    : { modo: "palavras", condicoes: [{ operador: "contem", valor: "" }], combinar: "qualquer" },
                )
              }
              className={cn(
                "h-8 flex-1 rounded-md border text-[12px]",
                filtro.modo === modo
                  ? "border-casca-marca bg-casca-marca-suave text-casca-texto"
                  : "border-casca-divisoria text-casca-texto-2 hover:bg-casca-raia",
              )}
            >
              {modo === "qualquer" ? t("Qualquer comentário") : t("Com palavras")}
            </button>
          ))}
        </div>
        <FiltroDePalavras filtro={filtro} aoMudar={mudarFiltro} />
      </div>

      <RespostaAoComentario resposta={caminho.resposta} aoMudar={(resposta) => aoMudar({ ...caminho, resposta })} />

      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[12px] text-casca-texto">
          {t("Ocultar o comentário depois do direct")}
          <AjudaDaCasca texto={t("O comentário continua visível para quem comentou e para a conta.")} />
        </p>
        <InterruptorDaCasca
          aria-label={t("Ocultar o comentário depois do direct")}
          ligado={caminho.ocultar_depois ?? false}
          aoMudar={(ocultar_depois) => aoMudar({ ...caminho, ocultar_depois })}
        />
      </div>
      {plataforma === "facebook" ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-casca-texto">{t("Curtir o comentário")}</p>
          <InterruptorDaCasca
            aria-label={t("Curtir o comentário")}
            ligado={caminho.curtir ?? false}
            aoMudar={(curtir) => aoMudar({ ...caminho, curtir })}
          />
        </div>
      ) : null}
    </div>
  );
}
