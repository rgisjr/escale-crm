"use client";
import type { ReactNode } from "react";

import { DicaAoPassar } from "@/components/escale/campanhas/DicaAoPassar";
import { cn } from "@/lib/utils";

import { CLASSE_DO_CARTAO } from "./estilos";

/** O "?" na cor da marca (009): círculo de 14px com a dica ao passar. */
export function SinalDeAjuda({ texto, focavel = true }: { texto: string; focavel?: boolean }) {
  return (
    <DicaAoPassar texto={texto}>
      <span
        role="img"
        aria-label={texto}
        tabIndex={focavel ? 0 : undefined}
        className="grid size-3.5 shrink-0 place-items-center rounded-full bg-casca-marca text-[9px] leading-none font-bold text-white"
      >
        ?
      </span>
    </DicaAoPassar>
  );
}

/**
 * O CARTÃO DO SUMÁRIO (fork Escale, Fase 8C; 009, 011): o rótulo e o "?" em
 * cima; embaixo o valor e " · n" em cinza (`complemento` é só o número). Sem
 * valor, "—". `tamanho="lg"` é o dos cartões de RESULTADO (18px). Clicável
 * vira botão (os de negócios abrem a gaveta).
 */
export function CartaoDoSumario({
  rotulo,
  dica,
  subtitulo,
  valor,
  complemento,
  tamanho = "md",
  aoClicar,
  carregando = false,
  children,
}: {
  rotulo: string;
  dica?: string;
  subtitulo?: string;
  valor?: string;
  complemento?: string;
  tamanho?: "md" | "lg";
  aoClicar?: () => void;
  carregando?: boolean;
  children?: ReactNode;
}) {
  const corpo = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-casca-texto">{rotulo}</span>
        {dica ? <SinalDeAjuda texto={dica} focavel={!aoClicar} /> : null}
      </span>
      {subtitulo ? <span className="mt-1 text-[11px] text-casca-suave">{subtitulo}</span> : null}
      <span className="mt-auto block pt-2">
        {carregando ? (
          <span
            data-esqueleto
            aria-hidden
            className="block h-5 w-16 animate-pulse rounded-[4px] bg-casca-raia"
          />
        ) : children !== undefined ? (
          children
        ) : (
          <span
            className={cn(
              "text-casca-texto",
              tamanho === "lg" ? "text-[18px] font-bold" : "text-[15px] font-semibold",
            )}
          >
            {valor ?? "—"}
            {complemento ? (
              <span className="ml-1 text-[12px] font-normal text-casca-suave">· {complemento}</span>
            ) : null}
          </span>
        )}
      </span>
    </>
  );
  if (aoClicar) {
    return (
      <button
        type="button"
        onClick={aoClicar}
        className={cn(
          CLASSE_DO_CARTAO,
          "transition-colors hover:border-casca-marca-media focus-visible:outline-2 focus-visible:outline-casca-marca",
        )}
      >
        {corpo}
      </button>
    );
  }
  return <div className={CLASSE_DO_CARTAO}>{corpo}</div>;
}
