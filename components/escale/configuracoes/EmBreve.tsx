"use client";
import { useT } from "@/hooks/i18n/useT";

/** A subaba de outra fase (F13): o item existe no menu da Clint; o conteúdo chega na fase dela. */
export function EmBreve({ titulo, texto }: { titulo: string; texto: string }) {
  const t = useT();
  return (
    <section className="max-w-[784px] rounded-[12px] border border-dashed border-casca-borda p-6">
      <h3 className="text-[15px] font-medium text-casca-texto">{titulo}</h3>
      <p className="mt-2 text-[13px] text-casca-suave">
        <span className="mr-2 rounded-[4px] bg-casca-marca-suave px-1.5 py-0.5 text-[11px] font-medium text-casca-marca">
          {t("Em breve")}
        </span>
        {texto}
      </p>
    </section>
  );
}
