"use client";
import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/hooks/i18n/useT";
import type { TipoDeImportacao } from "@/lib/escale/importacao/regras";
import { cn } from "@/lib/utils";

/** As peças do assistente de importação (fork Escale, Fase 2F; medidas da 1E, prints v2-06 a v2-11). */
export const TITULO = "text-[22px] leading-8 font-medium text-casca-texto";
export const SUBTITULO = "mt-1 text-[13px] leading-5 text-[#5A5964]";

const BOTAO_BASE =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-[6px] px-3.5 text-[13px] whitespace-nowrap focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-casca-marca focus-visible:ring-offset-2";
export const BOTAO_DA_MARCA = `${BOTAO_BASE} bg-casca-marca font-medium text-accent-foreground hover:bg-casca-marca-forte disabled:pointer-events-none disabled:opacity-45`;
export const BOTAO_DE_CONTORNO = `${BOTAO_BASE} border border-[#D9D8E0] text-casca-texto hover:bg-casca-raia disabled:pointer-events-none disabled:opacity-45`;

export function ColunaCentral({ largura, children }: { largura: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full", largura)}>{children}</div>;
}

export function Titulo({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <div className="text-center">
      <h2 className={TITULO}>{titulo}</h2>
      <p className={SUBTITULO}>{subtitulo}</p>
    </div>
  );
}

/** O balão escuro da Clint explica um "Continuar" desligado; o botão desligado não recebe o mouse, então o gatilho é o que o envolve. */
export function BotaoDoRodape({
  desabilitado,
  dica,
  aoClicar,
  children,
}: {
  desabilitado: boolean;
  dica?: string;
  aoClicar: () => void;
  children: ReactNode;
}) {
  const botao = (
    <button type="button" disabled={desabilitado} onClick={aoClicar} className={BOTAO_DA_MARCA}>
      {children}
    </button>
  );
  if (!desabilitado || !dica) return botao;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{botao}</span>
      </TooltipTrigger>
      <TooltipContent side="top">{dica}</TooltipContent>
    </Tooltip>
  );
}

/** "Contatos / Negócios": pílulas de 28px, a ativa branca com sombra curta (print 2b-41). */
export function SeletorDoTipo({
  tipo,
  aoMudar,
  desabilitado,
}: {
  tipo: TipoDeImportacao;
  aoMudar: (tipo: TipoDeImportacao) => void;
  desabilitado: boolean;
}) {
  const t = useT();
  const pilula = "h-7 rounded-[6px] px-3 text-[12px] font-medium disabled:cursor-not-allowed";
  const opcoes: Array<[TipoDeImportacao, string]> = [
    ["contato", t("Contatos")],
    ["negocio", t("Negócios")],
  ];
  return (
    <div role="tablist" className="inline-flex gap-0.5 rounded-[8px] bg-[#F4F4F7] p-0.5">
      {opcoes.map(([valor, rotulo]) => (
        <button
          key={valor}
          type="button"
          role="tab"
          aria-selected={tipo === valor}
          disabled={desabilitado}
          onClick={() => aoMudar(valor)}
          className={cn(pilula, tipo === valor ? "bg-white text-casca-texto shadow-[0_1px_2px_rgb(0_0_0/0.12)]" : "text-[#5A5964]")}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}
