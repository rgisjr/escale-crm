"use client";
import { useT } from "@/hooks/i18n/useT";

/** Falha de carga no lugar do "vazio": o erro não pode parecer lista sem nada (Faixa B da revisão). */
export function ErroDaLista({ mensagem, aoTentar }: { mensagem: string; aoTentar: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="mx-auto flex max-w-[360px] flex-col items-center gap-2 py-10 text-center">
      <p className="text-[14px] font-semibold text-casca-texto">{mensagem}</p>
      <button type="button" onClick={aoTentar} className="text-[13px] font-semibold text-casca-marca hover:underline">
        {t("Tentar de novo")}
      </button>
    </div>
  );
}
