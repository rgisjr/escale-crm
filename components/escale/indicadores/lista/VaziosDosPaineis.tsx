"use client";
import { useT } from "@/hooks/i18n/useT";
import { ChartNoAxesColumn } from "@/lib/ui/icons-da-casca";

const ESQUELETOS = 6;

/** Carregando: 6 retângulos de 85 px na grade dos cards. */
export function EsqueletoDosPaineis() {
  return (
    <>
      {Array.from({ length: ESQUELETOS }, (_, i) => (
        <div key={i} data-testid="esqueleto-do-painel" className="h-[85px] animate-pulse rounded-[6px] bg-casca-raia" />
      ))}
    </>
  );
}

/** Nenhum painel ainda. Provisório pelo material, sem print (PRD 7, seção 11). */
export function VazioDosPaineis() {
  const t = useT();
  return (
    <div className="mx-auto flex max-w-[420px] flex-col items-center gap-2 py-16 text-center">
      <span className="mb-2 grid size-14 place-items-center rounded-full bg-casca-marca-suave text-casca-marca">
        <ChartNoAxesColumn size={32} aria-hidden />
      </span>
      <p className="text-[14px] font-medium text-casca-texto">{t("Você ainda não criou um Dashboard.")}</p>
      <p className="text-[13px] text-casca-suave">
        {t("Crie seu primeiro dashboard e acompanhe os seus indicadores com números e gráficos.")}
      </p>
    </div>
  );
}

/** Busca sem resultado. Provisório (sem print). */
export function BuscaSemResultado() {
  const t = useT();
  return <p className="py-16 text-center text-[13px] text-casca-suave">{t("Nenhum dashboard encontrado.")}</p>;
}
