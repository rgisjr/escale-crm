"use client";
import { useState, type KeyboardEvent } from "react";

import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { MAXIMO_DA_PALAVRA, MAXIMO_DE_PALAVRAS } from "@/lib/escale/comentarios/constantes";
import type { CaminhoDoGatilho, FiltroDoCaminho } from "@/lib/escale/comentarios/schema";
import { Trash2, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { RespostaAoComentario } from "./RespostaAoComentario";

/**
 * O CARTÃO DO CAMINHO (fork Escale, Fase 10B): a publicação (em "Posts específicos"), o filtro de
 * comentário e a resposta pública. Provisório: sem print da Clint, molde pelos textos dela.
 */
export function CaminhoDoComentario({
  caminho,
  titulo,
  aoMudar,
  aoRemover,
}: {
  caminho: CaminhoDoGatilho;
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
                mudarFiltro(modo === "qualquer" ? { modo: "qualquer" } : { modo: "palavras", palavras: [], combinar: "qualquer" })
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
        {filtro.modo === "palavras" ? (
          <>
            <CampoDePalavras palavras={filtro.palavras ?? []} aoMudar={(palavras) => mudarFiltro({ ...filtro, palavras })} />
            <div className="flex flex-col gap-1">
              <p className="text-[11px] text-casca-suave">{t("Combinar palavras com")}</p>
              <SeletorDaCasca
                aria-label={t("Combinar palavras com")}
                aparencia="janela"
                valor={filtro.combinar}
                aoMudar={(v) => v && mudarFiltro({ ...filtro, combinar: v })}
                opcoes={[
                  { valor: "qualquer", rotulo: t("Qualquer palavra") },
                  { valor: "todas", rotulo: t("Todas as palavras") },
                ]}
              />
            </div>
          </>
        ) : null}
      </div>

      <RespostaAoComentario resposta={caminho.resposta} aoMudar={(resposta) => aoMudar({ ...caminho, resposta })} />
    </div>
  );
}

/** Palavras em chips: Enter ou vírgula adiciona; × remove. Sem repetir (sem caixa), até 20. */
function CampoDePalavras({ palavras, aoMudar }: { palavras: readonly string[]; aoMudar: (p: string[]) => void }) {
  const t = useT();
  const [texto, setTexto] = useState("");

  function adicionar() {
    const nova = texto.trim().slice(0, MAXIMO_DA_PALAVRA);
    setTexto("");
    if (!nova || palavras.length >= MAXIMO_DE_PALAVRAS) return;
    if (palavras.some((p) => p.toLowerCase() === nova.toLowerCase())) return;
    aoMudar([...palavras, nova]);
  }
  function teclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      adicionar();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-[4px] bg-casca-raia p-2">
      {palavras.map((p) => (
        <span key={p} className="flex items-center gap-1 rounded-md bg-casca-marca-suave px-2 py-0.5 text-[12px] text-casca-texto">
          {p}
          <button
            type="button"
            aria-label={`${t("Remover")} ${p}`}
            onClick={() => aoMudar(palavras.filter((x) => x !== p))}
            className="grid size-3.5 place-items-center text-casca-suave hover:text-casca-texto"
          >
            <X size={10} aria-hidden />
          </button>
        </span>
      ))}
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={teclar}
        onBlur={adicionar}
        aria-label={t("Palavras do filtro")}
        placeholder={t("Digite uma palavra e aperte Enter")}
        className="min-w-[140px] flex-1 border-0 bg-transparent text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
      />
    </div>
  );
}
