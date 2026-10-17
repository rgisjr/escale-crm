"use client";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { paginasVisiveis, totalDePaginas } from "@/lib/escale/contatos/regras";
import { cn } from "@/lib/utils";

/**
 * A PAGINAÇÃO DA CASCA (fork Escale, Fase 2A; captura 03-001): "N por página" à
 * esquerda; "Anterior", as páginas e "Próximo" à direita. Páginas de 32×32 com
 * borda; a atual cheia na cor da marca. Reaproveitada pela lista de empresas (2D).
 */
export function PaginacaoDaCasca({
  pagina,
  total,
  porPagina,
  opcoesPorPagina,
  aoMudarPagina,
  aoMudarPorPagina,
}: {
  pagina: number;
  total: number;
  porPagina: number;
  opcoesPorPagina: readonly number[];
  aoMudarPagina: (pagina: number) => void;
  aoMudarPorPagina: (porPagina: number) => void;
}) {
  const t = useT();
  const ultima = totalDePaginas(total, porPagina);
  const opcoes = opcoesPorPagina.map((n) => ({
    valor: String(n),
    rotulo: `${n} ${t("por página")}`,
  }));
  const passo =
    "inline-flex h-8 items-center rounded-casca-gatilho px-3 text-[13px] font-medium text-casca-texto transition-colors hover:bg-casca-raia disabled:pointer-events-none disabled:text-casca-meta";

  return (
    <div className="flex h-[50px] items-center justify-between gap-4">
      <SeletorDaCasca
        valor={String(porPagina)}
        opcoes={opcoes}
        aoMudar={(v) => v && aoMudarPorPagina(Number(v))}
        aria-label={t("Por página")}
        className="h-8 w-[180px]"
      />
      <nav aria-label={t("Paginação")} className="flex items-center gap-2">
        <button
          type="button"
          className={passo}
          disabled={pagina <= 1}
          onClick={() => aoMudarPagina(pagina - 1)}
        >
          {t("Anterior")}
        </button>
        {paginasVisiveis(pagina, ultima).map((item, i) =>
          item === "…" ? (
            <span key={`r${i}`} className="px-1 text-[13px] text-casca-suave">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === pagina ? "page" : undefined}
              onClick={() => aoMudarPagina(item)}
              className={cn(
                "inline-flex h-8 min-w-8 items-center justify-center rounded-casca-gatilho border px-2 text-[13px] font-medium transition-colors",
                item === pagina
                  ? "border-casca-marca bg-casca-marca text-white"
                  : "border-casca-borda bg-surface text-casca-texto hover:bg-casca-raia",
              )}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          className={passo}
          disabled={pagina >= ultima}
          onClick={() => aoMudarPagina(pagina + 1)}
        >
          {t("Próximo")}
        </button>
      </nav>
    </div>
  );
}
