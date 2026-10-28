"use client";
import { useT } from "@/hooks/i18n/useT";
import { Search } from "@/lib/ui/icons-da-casca";

/** A faixa de 56 px com "Buscar dashboard" (10-001). Filtra no cliente. */
export function BuscaDosPaineis({ valor, aoMudar }: { valor: string; aoMudar: (v: string) => void }) {
  const t = useT();
  return (
    <div className="flex h-14 shrink-0 items-center border-b border-casca-divisoria px-6">
      <label className="relative w-[150px]">
        <span className="sr-only">{t("Buscar dashboard")}</span>
        <input
          type="search"
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          placeholder={t("Buscar dashboard")}
          className="h-8 w-full rounded-[6px] border-0 bg-casca-raia pr-8 pl-3 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-suave focus:ring-2 focus:ring-casca-marca"
        />
        <Search size={16} aria-hidden className="pointer-events-none absolute top-2 right-2.5 text-casca-suave" />
      </label>
    </div>
  );
}
