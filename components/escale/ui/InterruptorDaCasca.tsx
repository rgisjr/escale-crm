"use client";
import { cn } from "@/lib/utils";

/**
 * O INTERRUPTOR DA CASCA (fork Escale, Fase 1E; a janela "Personalizar cards" da
 * Clint, 01-019): pílula de 28×16, trilho da marca quando ligado e #CECED3
 * desligado, bolinha branca de 12px. Sem o `Switch` do original (outro visual).
 */
export function InterruptorDaCasca({
  ligado,
  aoMudar,
  desabilitado = false,
  title,
  "aria-label": rotulo,
}: {
  ligado: boolean;
  aoMudar: (v: boolean) => void;
  "aria-label": string;
  desabilitado?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      title={title}
      disabled={desabilitado}
      onClick={() => aoMudar(!ligado)}
      className={cn(
        "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-casca-marca",
        "disabled:cursor-not-allowed disabled:opacity-[0.55]",
        ligado ? "bg-casca-marca" : "bg-[#CECED3]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0.5 size-3 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.35)] transition-transform duration-150",
          ligado && "translate-x-3",
        )}
      />
    </button>
  );
}
