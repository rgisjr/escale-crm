"use client";
import { useState } from "react";

import { MergeDialog } from "@/components/contacts/MergeDialog";
import { useContactDuplicates } from "@/hooks/contacts/useContactDuplicates";
import { useT } from "@/hooks/i18n/useT";
import { TriangleAlert } from "@/lib/ui/icons-da-casca";

/** O selo "{n} sugestões de mescla" (Clint `duplicate-contacts-alert`); abre o juntar do original. */
export function SeloDeMescla() {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const grupos = useContactDuplicates(true);
  const n = grupos.data?.data?.length ?? 0;
  if (n === 0) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        title={t("Clique para revisar e mesclar as sugestões")}
        className="flex h-[31px] items-center gap-2 rounded-casca-gatilho border border-warning bg-warning-bg px-3 text-[13px] font-medium text-casca-texto hover:brightness-95"
      >
        <TriangleAlert size={15} aria-hidden className="text-warning" />
        {n} {n === 1 ? t("sugestão de mescla") : t("sugestões de mescla")}
      </button>
      <MergeDialog open={aberto} onOpenChange={setAberto} />
    </>
  );
}
