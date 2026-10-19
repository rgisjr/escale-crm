"use client";
import { useT } from "@/hooks/i18n/useT";
import { Funnel } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** O funil da barra (c32, c64): ativo com o painel aberto ou com critério; o selo com o total. */
export function FunilDaFila({
  total,
  ativo,
  aoAlternar,
}: {
  total: number;
  ativo: boolean;
  aoAlternar: () => void;
}) {
  const t = useT();
  const aceso = ativo || total > 0;
  return (
    <button
      type="button"
      aria-label={t("Filtros")}
      title={t("Filtros")}
      aria-pressed={ativo}
      onClick={aoAlternar}
      className={cn(
        "flex h-6 items-center gap-1 rounded-casca-gatilho px-1 hover:bg-casca-raia",
        aceso ? "bg-casca-marca-suave text-casca-marca" : "text-casca-suave",
        total > 0 && "px-1.5",
      )}
    >
      <Funnel size={16} aria-hidden />
      {total > 0 ? (
        <span className="grid size-4 place-items-center rounded-full bg-casca-marca text-[10px] font-semibold text-white tabular-nums">
          {total}
        </span>
      ) : null}
    </button>
  );
}
