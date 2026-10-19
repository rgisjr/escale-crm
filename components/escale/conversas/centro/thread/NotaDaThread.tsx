"use client";
import { useT } from "@/hooks/i18n/useT";
import type { Note } from "@/lib/types/messaging";
import { PenLine } from "@/lib/ui/icons-da-casca";

const hora = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** A nota interna na thread (c12 depois de salva): caixa amarela à direita, "Nota interna · {quem}". */
export function NotaDaThread({ nota }: { nota: Note }) {
  const t = useT();
  return (
    <div className="my-1 flex justify-end" data-testid={`item-note-${nota.id}`}>
      <div className="max-w-[65%] rounded-lg rounded-tr-none border border-casca-nota-borda bg-casca-nota px-3 py-2">
        <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-casca-pausa-texto">
          <PenLine size={12} aria-hidden />
          {t("Nota interna")}
          {nota.created_by_name ? ` · ${nota.created_by_name}` : ""}
        </div>
        <p className="text-[13px] whitespace-pre-wrap text-casca-texto">{nota.body}</p>
        <div className="mt-1 text-right text-[11px] text-casca-meta">{hora(nota.created_at)}</div>
      </div>
    </div>
  );
}
