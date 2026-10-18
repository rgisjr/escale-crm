"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

import { DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * "CONFIRME SUA AÇÃO" DA CLINT (v2-03; fork Escale, Fase 2B): título 16px/500 e X
 * numa faixa de 56px, o texto em 13px, e o rodapé com "Cancelar" (contorno) e o
 * botão de confirmar (na cor da marca, ou vermelho quando `perigo`). A mesma
 * janela que `ExportarCards` (1E) monta por dentro, agora reaproveitável.
 */
export function JanelaDeConfirmacao({
  aberta,
  aoFechar,
  titulo,
  children,
  rotuloDoConfirmar,
  iconeDoConfirmar,
  aoConfirmar,
  perigo = false,
  desabilitado = false,
  ocupado = false,
  dica,
}: {
  aberta: boolean;
  aoFechar: () => void;
  titulo?: string;
  children: ReactNode;
  rotuloDoConfirmar?: string;
  /** Ícone depois do rótulo (a lixeira do "Apagar Contatos", print 2b-38). */
  iconeDoConfirmar?: ReactNode;
  aoConfirmar: () => void;
  perigo?: boolean;
  desabilitado?: boolean;
  ocupado?: boolean;
  /** Por que o confirmar está desligado (o `title`). */
  dica?: string;
}) {
  const t = useT();
  return (
    <DialogPrimitive.Root open={aberta} onOpenChange={(a) => !a && !ocupado && aoFechar()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/48" />
        <DialogPrimitive.Content className="fixed top-[50%] left-[50%] z-50 w-[min(576px,calc(100vw-2rem))] translate-x-[-50%] translate-y-[-50%] rounded-[8px] bg-surface text-casca-texto shadow-casca-painel">
          <div className="flex h-14 items-center justify-between border-b border-casca-borda px-5">
            <DialogTitle className="text-base font-medium">
              {titulo ?? t("Confirme sua ação")}
            </DialogTitle>
            <DialogPrimitive.Close
              aria-label={t("Fechar")}
              className="grid size-6 place-items-center text-casca-suave hover:text-casca-texto"
            >
              <X size={16} aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description asChild>
            <div className="space-y-3 px-6 py-6 text-[13px] text-casca-suave">{children}</div>
          </DialogPrimitive.Description>
          <div className="flex justify-end gap-3 border-t border-casca-borda px-3 py-3">
            <button
              type="button"
              onClick={aoFechar}
              disabled={ocupado}
              title={ocupado ? t("Aguarde…") : undefined}
              className="h-8 rounded-[6px] border border-casca-borda px-4 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
            >
              {t("Cancelar")}
            </button>
            <button
              type="button"
              onClick={aoConfirmar}
              disabled={desabilitado || ocupado}
              title={desabilitado ? dica : ocupado ? t("Aguarde…") : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-[6px] px-4 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50",
                perigo
                  ? "bg-casca-alerta hover:brightness-95"
                  : "bg-casca-marca hover:bg-casca-marca-forte",
              )}
            >
              {rotuloDoConfirmar ?? t("Confirmar")}
              {iconeDoConfirmar}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
