"use client";

import { useT } from "@/hooks/i18n/useT";
import { PAPEIS_DE_VISIBILIDADE, ROTULO_DA_VISIBILIDADE, type CampoDoCatalogo, type PapelMinimo } from "@/lib/escale/campos/regras";

/**
 * "Restringir visibilidade" (FieldsConfig da Clint). A Clint escolhe grupos de
 * permissão; aqui, o papel mínimo (Q1). Uma linha por opção, com rádio.
 */
export function BalaoDeVisibilidade({ campo, aoMudar }: { campo: CampoDoCatalogo; aoMudar: (papel: PapelMinimo | null) => void }) {
  const t = useT();
  const opcoes: Array<PapelMinimo | "todos"> = ["todos", ...PAPEIS_DE_VISIBILIDADE];
  const atual = campo.papel_minimo ?? "todos";
  return (
    <div role="radiogroup" aria-label={t("Restringir visibilidade")} className="flex w-[260px] flex-col gap-0.5 p-1">
      <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-casca-meta">{t("Restrito para")}</p>
      {opcoes.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={atual === o}
          onClick={() => aoMudar(o === "todos" ? null : o)}
          className="flex h-8 items-center gap-2 rounded-[6px] px-2 text-[13px] text-casca-texto hover:bg-casca-raia"
        >
          <span className={`inline-block size-3.5 rounded-full border ${atual === o ? "border-casca-marca bg-casca-marca shadow-[inset_0_0_0_3px_var(--escale-superficie)]" : "border-casca-borda"}`} />
          {t(ROTULO_DA_VISIBILIDADE[o])}
        </button>
      ))}
    </div>
  );
}
