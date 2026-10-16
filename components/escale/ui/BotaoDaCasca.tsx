"use client";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * O BOTÃO DA CASCA (fork Escale, casca igual à Clint V1).
 *
 * Quatro formas, medidas nos prints da Clint (menu superior, px de CSS):
 * - `marca`: o "Negócio +" — cor da marca da organização no lugar do roxo da
 *   Clint, texto branco, 31px de altura, canto de 6px;
 * - `novo`: o "Novo +" do topo — azul #597EFF na Clint, que NÃO é a cor da
 *   marca dela, então é copiado como está;
 * - `texto`: sem fundo, texto escuro;
 * - `icone`: quadrado de 28px só com ícone (atualizar, engrenagem, ajuda).
 *   Quem usa passa `aria-label`.
 *
 * Não usa o botão do original (`components/ui/button`): o visual é outro, e
 * ele traz a altura de toque de 44px que a Clint não tem. (A cerca
 * `controle-decorativo` lê o texto do arquivo, então este comentário evita
 * escrever a tag do componente.)
 */
export type VarianteDoBotaoDaCasca = "marca" | "novo" | "texto" | "icone";
export type TamanhoDoBotaoDaCasca = "md" | "sm";

export type BotaoDaCascaProps = {
  variante: VarianteDoBotaoDaCasca;
  tamanho?: TamanhoDoBotaoDaCasca;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const BASE =
  "inline-flex items-center justify-center whitespace-nowrap font-medium leading-[1.2] transition-colors duration-fast ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-casca-marca focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";

const VARIANTES: Record<VarianteDoBotaoDaCasca, string> = {
  marca: "rounded-casca-gatilho bg-casca-marca text-accent-foreground hover:bg-casca-marca-forte",
  novo: "rounded-[5px] bg-casca-novo text-white hover:brightness-95",
  texto: "rounded-casca-gatilho bg-transparent text-casca-texto-2 hover:bg-casca-raia",
  icone: "rounded-casca-gatilho bg-transparent text-casca-suave hover:bg-casca-raia hover:text-casca-texto",
};

const TAMANHOS: Record<VarianteDoBotaoDaCasca, Record<TamanhoDoBotaoDaCasca, string>> = {
  marca: {
    md: "h-[31px] gap-2 px-3.5 text-[13px] [&_svg]:size-4",
    sm: "h-[26px] gap-1.5 px-3 text-xs [&_svg]:size-3.5",
  },
  novo: {
    md: "h-[22px] gap-1 px-2 text-[11px] [&_svg]:size-3",
    sm: "h-5 gap-1 px-1.5 text-[10px] [&_svg]:size-3",
  },
  texto: {
    md: "h-9 gap-2 px-2.5 text-[13px] [&_svg]:size-4",
    sm: "h-7 gap-1.5 px-2 text-xs [&_svg]:size-3.5",
  },
  icone: {
    md: "size-7 [&_svg]:size-4",
    sm: "size-6 [&_svg]:size-3.5",
  },
};

export const BotaoDaCasca = forwardRef<HTMLButtonElement, BotaoDaCascaProps>(function BotaoDaCasca(
  { variante, tamanho = "md", className, type = "button", ...resto },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-variante={variante}
      className={cn(BASE, VARIANTES[variante], TAMANHOS[variante][tamanho], className)}
      {...resto}
    />
  );
});
