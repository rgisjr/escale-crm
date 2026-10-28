"use client";
import { DicaAoPassar } from "@/components/escale/campanhas/DicaAoPassar";
import { useT } from "@/hooks/i18n/useT";

/** O "?" da Clint (10-012): círculo sólido de 14 px na cor da marca com o "?" branco. Sem Tooltip do Radix (S19). */
export function AjudaDoEditor({ texto }: { texto: string }) {
  const t = useT();
  return (
    <DicaAoPassar texto={texto}>
      <span
        role="img"
        tabIndex={0}
        aria-label={t("Ajuda")}
        className="inline-grid size-3.5 cursor-help place-items-center rounded-full bg-casca-marca text-[10px] font-semibold leading-none text-white"
      >
        ?
      </span>
    </DicaAoPassar>
  );
}
