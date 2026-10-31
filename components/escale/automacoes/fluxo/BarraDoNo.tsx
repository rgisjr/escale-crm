"use client";
import { createContext, useContext } from "react";

import { useT } from "@/hooks/i18n/useT";
import { Copy, Trash2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** O que a barra do nó pode pedir à tela: quem sabe duplicar e remover é o estado do fluxo. */
export interface AcoesDoNo {
  duplicar: (id: string) => void;
  /** Pede a confirmação "Tem certeza que deseja remover esse bloco?" e só então remove. */
  remover: (id: string) => void;
}
export const AcoesDoNoContext = createContext<AcoesDoNo | null>(null);
export const useAcoesDoNo = () => useContext(AcoesDoNoContext);

const BOTAO = "nodrag nopan grid size-[30px] place-items-center rounded-md text-casca-texto-2 hover:bg-casca-raia";

/**
 * A BARRA DO NÓ (E11, D14): 45 px acima e à direita, ao passar o mouse ou com o
 * nó selecionado. Gatilho não tem; Condições só remove (a caixa é uma só).
 */
export function BarraDoNo({
  id,
  podeDuplicar,
  selecionado,
}: {
  id: string;
  podeDuplicar: boolean;
  selecionado: boolean;
}) {
  const t = useT();
  const acoes = useAcoesDoNo();
  if (!acoes) return null;
  return (
    <div
      className={cn(
        "nodrag nopan absolute -top-[45px] right-0 hidden gap-1 rounded-lg bg-surface p-1 shadow-[0_2px_4px_rgb(0_0_0/0.15)] group-hover:flex",
        selecionado && "flex",
      )}
    >
      {podeDuplicar && (
        <button
          type="button"
          aria-label={t("Duplicar passo")}
          title={t("Duplicar passo")}
          className={BOTAO}
          onClick={() => acoes.duplicar(id)}
        >
          <Copy size={14} aria-hidden />
        </button>
      )}
      <button
        type="button"
        aria-label={t("Remover passo")}
        title={t("Remover passo")}
        className={cn(BOTAO, "hover:text-casca-alerta")}
        onClick={() => acoes.remover(id)}
      >
        <Trash2 size={14} aria-hidden />
      </button>
    </div>
  );
}
