"use client";
import { useT } from "@/hooks/i18n/useT";
import { X } from "@/lib/ui/icons-da-casca";

/** "Negócio Quantidade ×" (10-036): 32 px, fundo cinza-lavanda, raio 4. */
export function ChipDoEditor({ nome, aoRemover }: { nome: string; aoRemover: () => void }) {
  const t = useT();
  return (
    <span className="inline-flex h-8 max-w-full items-center gap-2 rounded-[4px] bg-casca-raia px-3 text-[13px] text-casca-texto">
      <span className="truncate">{nome}</span>
      <button
        type="button"
        aria-label={t("Remover {nome}").replace("{nome}", nome)}
        onClick={aoRemover}
        className="grid shrink-0 place-items-center text-casca-texto hover:text-casca-marca"
      >
        <X size={14} aria-hidden />
      </button>
    </span>
  );
}
