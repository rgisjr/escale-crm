"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * A JANELA DA CASCA (fork Escale · casca V3): o modal das janelas do painel com
 * o visual da Clint, variante superior (01-013):
 * - cortina escura a ~55%;
 * - caixa branca de raio 8, sem borda, com a sombra do painel e 24px de respiro;
 * - o X de fechar no canto.
 *
 * Usa o Dialog do Radix direto porque o `DialogContent` do original fixa a
 * cortina (`bg-black/80`), a borda e o raio, e o original não muda. A cortina e
 * os textos reaproveitam `DialogOverlay`, `DialogTitle` e `DialogDescription`
 * com classes por cima, o que mantém o nome acessível da janela pelo título.
 */
export function JanelaDaCasca({
  aberta,
  onFechar,
  children,
  className,
}: {
  aberta: boolean;
  onFechar: () => void;
  children: ReactNode;
  /** Largura (ou outro ajuste) da caixa; vem depois das classes padrão para vencer. */
  className?: string;
}) {
  const t = useT();
  return (
    <DialogPrimitive.Root
      open={aberta}
      onOpenChange={(aberto) => {
        if (!aberto) onFechar();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-black/55" />
        <DialogPrimitive.Content
          className={cn(
            "ds-modal fixed top-[50%] left-[50%] z-50 grid max-h-[85dvh] w-[min(28rem,calc(100vw-2rem))] translate-x-[-50%] translate-y-[-50%] gap-5 overflow-y-auto rounded-[8px] bg-surface p-6 text-casca-texto shadow-casca-painel",
            className,
          )}
        >
          {children}
          <DialogPrimitive.Close
            aria-label={t("Fechar")}
            className="absolute top-4 right-4 grid size-6 place-items-center rounded-casca-gatilho text-casca-suave transition-colors hover:text-casca-texto focus-visible:outline-2 focus-visible:outline-casca-marca"
          >
            <X size={16} aria-hidden />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}

/** Título 22px/400 #2F2C5D (01-013) e, se houver, a explicação 13px cinza logo abaixo. */
export function CabecaDaJanela({ titulo, descricao }: { titulo: ReactNode; descricao?: ReactNode }) {
  return (
    <DialogHeader className="space-y-1 pr-8 text-left sm:text-left">
      <DialogTitle className="text-[22px] leading-[30px] font-normal tracking-normal text-casca-texto">
        {titulo}
      </DialogTitle>
      {descricao && (
        <DialogDescription className="text-[13px] leading-5 text-casca-suave">{descricao}</DialogDescription>
      )}
    </DialogHeader>
  );
}

/** Rótulo 13px/500 acima do campo, com o "*" vermelho do obrigatório (01-013, "Nome *"). */
export function Campo({
  rotulo,
  obrigatorio = false,
  children,
}: {
  rotulo: string;
  obrigatorio?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-[13px] font-medium text-casca-texto">
        {rotulo}
        {obrigatorio && (
          <span aria-hidden className="ml-0.5 text-casca-alerta">
            *
          </span>
        )}
      </span>
      {children}
    </div>
  );
}

/** O campo de texto da Clint (01-013): #EFF3FF, sem borda, 43px, raio 4, texto 13px a 20px da borda. */
export function CampoDeTexto({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      {...props}
      className={cn(
        "h-[43px] w-full rounded-[4px] border-0 bg-casca-raia px-5 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca disabled:opacity-60",
        className,
      )}
    />
  );
}

type VarianteDoBotao = "cancelar" | "salvar" | "perigo";

const VARIANTE: Record<VarianteDoBotao, string> = {
  /** "Cancelar" de 01-013: branco, borda clara, texto navy. */
  cancelar: "border border-casca-borda bg-surface text-casca-texto hover:bg-casca-raia",
  /** "Salvar" de 01-013: verde-menta da Clint (não é a marca, então se copia). */
  salvar: "bg-(--escale-salvar) text-(--escale-salvar-texto) hover:brightness-95",
  /** Sem print da confirmação de excluir: o vermelho da casca, o mesmo do "Excluir" nos menus. */
  perigo: "bg-casca-alerta text-white hover:brightness-95",
};

/** Os botões do rodapé da janela: 32px, raio 4, 13px/500. Desligado fica a 60%, como o "Salvar" de 01-013. */
export function BotaoDaJanela({
  variante,
  enviar = false,
  className,
  ...props
}: { variante: VarianteDoBotao; enviar?: boolean } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  return (
    <button
      {...props}
      type={enviar ? "submit" : "button"}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-2 rounded-[4px] px-4 text-[13px] font-medium transition disabled:pointer-events-none disabled:opacity-60",
        VARIANTE[variante],
        className,
      )}
    />
  );
}

/** O rodapé: os botões à direita, lado a lado, "Cancelar" antes (01-013). */
export function RodapeDaJanela({ children }: { children: ReactNode }) {
  return <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">{children}</DialogFooter>;
}
