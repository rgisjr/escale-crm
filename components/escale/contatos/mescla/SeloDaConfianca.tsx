"use client";
import { useT } from "@/hooks/i18n/useT";
import { ROTULO_DA_FAIXA, faixaDaConfianca } from "@/lib/escale/mescla/regras";
import { cn } from "@/lib/utils";

const COR = {
  alta: "bg-success-bg text-success",
  media: "bg-warning-bg text-warning",
  baixa: "bg-destructive/10 text-destructive",
} as const;

/** "NN% · Alta" (Clint `scoreTier`: ≥ 85 verde, ≥ 65 laranja, abaixo vermelho). */
export function SeloDaConfianca({ confianca }: { confianca: number }) {
  const t = useT();
  const faixa = faixaDaConfianca(confianca);
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", COR[faixa])}>
      {`${confianca}% · ${t(ROTULO_DA_FAIXA[faixa])}`}
    </span>
  );
}
