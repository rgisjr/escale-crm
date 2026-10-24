"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

import { DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export interface AbaDoDetalhe {
  valor: string;
  rotulo: string;
}

/**
 * A JANELA DO DETALHE (fork Escale, Fase 8C; 009; material 6): quase a tela
 * toda sobre a lista escurecida — rótulo em caixa alta, o nome, as ações e o X;
 * as abas com o sublinhado da marca; o corpo rola sozinho. Genérica: a 8D usa
 * para a Prospecção. Os textos chegam traduzidos.
 */
export function JanelaDoDetalhe({
  aberta,
  aoFechar,
  rotulo,
  titulo,
  acoes,
  abas,
  abaAtiva,
  aoTrocarAba,
  children,
}: {
  aberta: boolean;
  aoFechar: () => void;
  rotulo: string;
  titulo: string;
  acoes?: ReactNode;
  abas: readonly AbaDoDetalhe[];
  abaAtiva: string;
  aoTrocarAba: (valor: string) => void;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <DialogPrimitive.Root
      open={aberta}
      onOpenChange={(a) => {
        if (!a) aoFechar();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-black/55" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-2 top-16 bottom-16 z-50 flex flex-col overflow-hidden rounded-[10px] bg-surface text-casca-texto shadow-casca-painel focus:outline-hidden"
        >
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-casca-divisoria px-8 pt-5 pb-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.08em] text-casca-suave uppercase">
                {rotulo}
              </p>
              <DialogTitle
                title={titulo}
                className="mt-1 truncate text-[18px] leading-6 font-semibold text-casca-texto"
              >
                {titulo}
              </DialogTitle>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {acoes}
              <DialogPrimitive.Close
                aria-label={t("Fechar")}
                className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave transition-colors hover:bg-casca-raia hover:text-casca-texto focus-visible:outline-2 focus-visible:outline-casca-marca"
              >
                <X size={18} aria-hidden />
              </DialogPrimitive.Close>
            </div>
          </header>
          <div role="tablist" aria-label={titulo} className="flex shrink-0 gap-1 px-8 pt-3">
            {abas.map((a) => {
              const ativa = a.valor === abaAtiva;
              return (
                <button
                  key={a.valor}
                  type="button"
                  role="tab"
                  aria-selected={ativa}
                  onClick={() => aoTrocarAba(a.valor)}
                  className={cn(
                    "relative px-3 pb-2.5 text-[13px] transition-colors",
                    ativa
                      ? "font-medium text-casca-marca after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-casca-marca"
                      : "text-casca-texto hover:text-casca-marca",
                  )}
                >
                  {a.rotulo}
                </button>
              );
            })}
          </div>
          <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
