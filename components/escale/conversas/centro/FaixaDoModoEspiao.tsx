"use client";
import { useT } from "@/hooks/i18n/useT";
import { Glasses } from "@/lib/ui/icons-da-casca";

/** A faixa verde do modo espião (c23; `component.SpyModeBar.*`). */
export function FaixaDoModoEspiao({ aoDesativar }: { aoDesativar: () => void }) {
  const t = useT();
  return (
    <div
      role="status"
      className="flex h-10 shrink-0 items-center gap-2 bg-casca-espiao px-4 text-[12px] text-casca-espiao-texto"
    >
      <Glasses size={16} aria-hidden />
      <span className="font-semibold">{t("Modo espião ativo")}</span>
      <span>{t("abrir uma conversa não vai marcá-la como lida.")}</span>
      <button type="button" onClick={aoDesativar} className="ml-auto underline underline-offset-2">
        {t("Desativar")}
      </button>
    </div>
  );
}
