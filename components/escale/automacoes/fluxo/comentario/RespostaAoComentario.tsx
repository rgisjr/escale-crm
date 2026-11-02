"use client";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  MAXIMO_DA_RESPOSTA,
  MAXIMO_DE_VARIACOES,
  TEXTO_PADRAO_DA_RESPOSTA,
} from "@/lib/escale/comentarios/constantes";
import type { CaminhoDoGatilho } from "@/lib/escale/comentarios/schema";
import { Plus, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

type Resposta = CaminhoDoGatilho["resposta"];

/**
 * A RESPOSTA AO COMENTÁRIO (fork Escale, Fase 10B, D8): até 5 variações; uma é sorteada e publicada
 * como resposta ao comentário, no fim da execução. Provisório: sem print da Clint.
 */
export function RespostaAoComentario({ resposta, aoMudar }: { resposta: Resposta; aoMudar: (r: Resposta) => void }) {
  const t = useT();

  if (!resposta) {
    return (
      <button
        type="button"
        onClick={() => aoMudar({ variacoes: [t(TEXTO_PADRAO_DA_RESPOSTA)] })}
        className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-casca-marca-forte hover:underline"
      >
        <Plus size={14} aria-hidden />
        {t("Adicionar resposta ao comentário")}
      </button>
    );
  }

  const { variacoes } = resposta;
  const mudarVariacao = (indice: number, texto: string) =>
    aoMudar({ variacoes: variacoes.map((v, i) => (i === indice ? texto : v)) });

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-casca-texto">
        {t("Resposta ao comentário")}
        <AjudaDaCasca texto={t("Uma das variações é escolhida ao acaso e publicada como resposta ao comentário.")} />
      </p>
      {variacoes.map((texto, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor={`variacao-${i}`} className="text-[11px] text-casca-suave">
              {t("Variação {n}").replace("{n}", String(i + 1))}
            </label>
            {variacoes.length > 1 ? (
              <button
                type="button"
                aria-label={t("Remover variação")}
                onClick={() => aoMudar({ variacoes: variacoes.filter((_, j) => j !== i) })}
                className="grid size-5 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
              >
                <X size={12} aria-hidden />
              </button>
            ) : null}
          </div>
          <textarea
            id={`variacao-${i}`}
            rows={2}
            value={texto}
            onChange={(e) => mudarVariacao(i, e.target.value)}
            placeholder={t("Escreva a resposta ao comentário")}
            className="w-full resize-none rounded-[4px] border-0 bg-casca-raia p-3 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
          />
          <span
            className={cn("self-end text-[10px]", texto.length > MAXIMO_DA_RESPOSTA ? "text-casca-alerta" : "text-casca-suave")}
          >
            {`${texto.length}/${MAXIMO_DA_RESPOSTA}`}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={variacoes.length >= MAXIMO_DE_VARIACOES}
          onClick={() => aoMudar({ variacoes: [...variacoes, ""] })}
          className="flex items-center gap-1.5 text-[12px] font-medium text-casca-marca-forte hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={12} aria-hidden />
          {t("Adicionar variação")}
        </button>
        <span className="text-[11px] text-casca-suave">
          {t("{n}/{max} variações").replace("{n}", String(variacoes.length)).replace("{max}", String(MAXIMO_DE_VARIACOES))}
        </span>
      </div>
      <button
        type="button"
        onClick={() => aoMudar(null)}
        className="w-fit text-[11px] text-casca-alerta hover:underline"
      >
        {t("Remover resposta ao comentário")}
      </button>
    </div>
  );
}
