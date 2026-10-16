"use client";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentProps } from "react";

import type { PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * O PAINEL SUSPENSO DA CASCA (fork Escale, casca igual à Clint V1).
 *
 * É o `PopoverContent` do original com o visual da Clint: fundo branco, borda
 * #E8E4F5, canto de 6px e a sombra `lg` dela. Vai dentro de um `<Popover>`
 * do original, no lugar do `PopoverContent`.
 *
 * Montado direto no primitivo do Radix de propósito: o `PopoverContent` fixa
 * `rounded-md shadow-md`, e o tailwind-merge não entende `rounded-casca-*` nem
 * `shadow-casca-*` como conflito deles — as duas classes iriam juntas.
 *
 * Alinha ao começo do gatilho, a 11px dele, como o "Data" da Clint (14px no
 * print, que tem escala 1,25). Sem padding: quem usa decide.
 */
export type PainelSuspensoProps = ComponentProps<typeof PopoverContent>;

export function PainelSuspenso({ className, align = "start", sideOffset = 11, ...props }: PainelSuspensoProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "ds-painel z-50 origin-(--radix-popover-content-transform-origin) rounded-casca-gatilho border border-casca-borda bg-surface text-casca-texto shadow-casca-painel outline-hidden",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
