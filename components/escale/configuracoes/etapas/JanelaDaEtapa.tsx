"use client";
import { useEffect, useRef, useState } from "react";

import { DicaEscura } from "@/components/escale/origens/DicaEscura";
import { BotaoDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  erroDaEtapa,
  MAX_DESCRICAO_DA_ETAPA,
  MAX_NOME_DA_ETAPA,
} from "@/lib/escale/etapas/rascunho";
import { HelpCircle } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** Marca o lápis: clicar nele não conta como "clicar fora" (ele mesmo abre e fecha a janelinha). */
export const MARCA_DO_LAPIS = "data-lapis-da-etapa";

/**
 * A JANELINHA "NOME DA ETAPA" (fork Escale, Fase 1L; Clint `EditStageDialog`, print de 24/10):
 * flutua sobre a coluna, com nome (40) e descrição (200, contador n/200). "Salvar" só muda o
 * RASCUNHO; quem grava no banco é o "Salvar na origem". Enter salva; clicar fora fecha.
 */
export function JanelaDaEtapa({
  nome,
  descricao,
  aoSalvar,
  aoFechar,
}: {
  nome: string;
  descricao: string;
  aoSalvar: (v: { nome: string; descricao: string }) => void;
  aoFechar: () => void;
}) {
  const t = useT();
  const [n, setN] = useState(nome);
  const [d, setD] = useState(descricao);
  const [erro, setErro] = useState<string | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (
        caixa.current &&
        alvo &&
        !caixa.current.contains(alvo) &&
        !alvo.closest(`[${MARCA_DO_LAPIS}]`)
      ) {
        aoFechar();
      }
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aoFechar]);

  function salvar() {
    const problema = erroDaEtapa(n, d, t);
    if (problema) {
      setErro(problema);
      return;
    }
    aoSalvar({ nome: n, descricao: d });
  }

  return (
    <div
      ref={caixa}
      role="dialog"
      aria-label={t("Nome da etapa")}
      className="absolute top-[10%] left-3 z-[1200] w-[350px] max-w-[600px] rounded-[8px] border border-casca-borda bg-surface p-6 shadow-casca-painel"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar();
        }}
      >
        <label className="mb-3 block">
          <span className="mb-2 flex items-center gap-2 text-[14px] font-bold text-casca-texto">
            {t("Nome da etapa")}
            <DicaEscura texto={t("O nome da etapa deve ter no máximo 40 caracteres.")}>
              <span className="text-casca-marca">
                <HelpCircle size={14} aria-hidden />
              </span>
            </DicaEscura>
          </span>
          <input
            type="text"
            value={n}
            maxLength={MAX_NOME_DA_ETAPA}
            placeholder={t("Etapa X")}
            onChange={(e) => setN(e.target.value)}
            className="h-[43px] w-full rounded-[4px] border-0 bg-casca-raia px-5 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-[14px] font-bold text-casca-texto">
            {t("Descrição da etapa")}{" "}
            <span className="font-normal text-casca-suave">({t("opcional")})</span>
          </span>
          <textarea
            rows={5}
            value={d}
            maxLength={MAX_DESCRICAO_DA_ETAPA}
            placeholder={t(
              "Nesta etapa o lead demonstrou interesse inicial e aguarda o primeiro contato da equipe comercial. O objetivo aqui é realizar o atendimento inicial, qualificar o lead e entender sua necessidade.",
            )}
            onChange={(e) => setD(e.target.value)}
            className="w-full resize-y rounded-[4px] border-0 bg-casca-raia p-5 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
          />
        </label>
        <p
          className={cn(
            "mt-1 text-right text-[13px]",
            d.length >= MAX_DESCRICAO_DA_ETAPA ? "text-casca-alerta" : "text-casca-texto",
          )}
        >
          {d.length}/{MAX_DESCRICAO_DA_ETAPA}
        </p>
        {erro ? (
          <p role="alert" className="mt-2 text-[12px] text-casca-alerta">
            {erro}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2.5">
          <BotaoDaJanela
            variante="cancelar"
            onClick={() => {
              setN(nome);
              setD(descricao);
              aoFechar();
            }}
          >
            {t("Cancelar")}
          </BotaoDaJanela>
          <BotaoDaJanela variante="salvar" onClick={salvar}>
            {t("Salvar")}
          </BotaoDaJanela>
        </div>
      </form>
    </div>
  );
}
