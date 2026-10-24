"use client";
import { useTotalDeSugestoes } from "@/hooks/escale/useSugestoesDeMescla";
import { useT } from "@/hooks/i18n/useT";
import { TriangleAlert } from "@/lib/ui/icons-da-casca";

/**
 * O selo "{n} sugestões de mescla" (Clint `duplicate-contacts-alert`). Fase 2E:
 * conta as sugestões da casca e abre a "Mesclar contatos duplicados" (N13).
 */
export function SeloDeMescla({ aoAbrir }: { aoAbrir: () => void }) {
  const t = useT();
  const n = useTotalDeSugestoes(true);
  if (n === 0) return null;
  return (
    <button
      type="button"
      onClick={aoAbrir}
      title={t("Clique para revisar e mesclar as sugestões")}
      className="flex h-[31px] items-center gap-2 rounded-casca-gatilho border border-warning bg-warning-bg px-3 text-[13px] font-medium text-casca-texto hover:brightness-95"
    >
      <TriangleAlert size={15} aria-hidden className="text-warning" />
      {n} {n === 1 ? t("sugestão de mescla") : t("sugestões de mescla")}
    </button>
  );
}
