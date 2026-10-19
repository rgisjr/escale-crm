"use client";
import { useT } from "@/hooks/i18n/useT";

/** A escolha à parte de "todas as do filtro" (decisão B3; textos nossos no tom da Clint). */
export function FaixaDoFiltroInteiro({
  modo,
  carregadas,
  total,
  aoSelecionarTodas,
  aoLimpar,
}: {
  modo: "carregadas" | "todas" | null;
  carregadas: number;
  total: number | null;
  aoSelecionarTodas: () => void;
  aoLimpar: () => void;
}) {
  const t = useT();
  if (!modo || total === null || total <= carregadas) return null;
  const totalBr = total.toLocaleString("pt-BR");
  const link = "font-medium text-casca-marca hover:underline";
  return (
    <div
      role="status"
      className="flex min-h-9 shrink-0 flex-wrap items-center justify-center gap-x-2 bg-casca-marca-suave px-3 py-1 text-center text-[12px] text-casca-texto"
    >
      {modo === "carregadas" ? (
        <>
          <span>
            {t("As {n} conversas carregadas estão selecionadas.").replace(
              "{n}",
              carregadas.toLocaleString("pt-BR"),
            )}
          </span>
          <button type="button" onClick={aoSelecionarTodas} className={link}>
            {t("Selecionar todas as {total} conversas do filtro").replace("{total}", totalBr)}
          </button>
        </>
      ) : (
        <>
          <span>
            {t("Todas as {total} conversas do filtro estão selecionadas.").replace(
              "{total}",
              totalBr,
            )}
          </span>
          <button type="button" onClick={aoLimpar} className={link}>
            {t("Limpar seleção")}
          </button>
        </>
      )}
    </div>
  );
}
