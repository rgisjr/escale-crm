"use client";
import { ErroDaLista } from "@/components/escale/ui/ErroDaLista";
import { useModelos } from "@/hooks/escale/useModelosDeIndicadores";
import { useT } from "@/hooks/i18n/useT";
import { modelosDaCategoria } from "@/lib/escale/indicadores/modelos/regras";
import type { ModeloNaLista } from "@/lib/escale/indicadores/modelos/tipos";
import { LayoutTemplate, Search } from "@/lib/ui/icons-da-casca";

import { CardDoModelo } from "./CardDoModelo";

const ESQUELETOS = [1, 2, 3, 4, 5];

/** "Selecione um modelo" (10-005): título, busca e a grade de 3 colunas; carregando, erro e vazio (10-018). */
export function GradeDeModelos({
  categoria,
  busca,
  aoBuscar,
  aoUsar,
}: {
  categoria: "todos" | "meus";
  busca: string;
  aoBuscar: (v: string) => void;
  aoUsar: (m: ModeloNaLista) => void;
}) {
  const t = useT();
  const modelos = useModelos(true);
  const visiveis = modelosDaCategoria(modelos.data ?? [], categoria, busca);

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] text-casca-texto">{t("Selecione um modelo")}</p>
        <label className="relative w-[150px]">
          <span className="sr-only">{t("Buscar")}</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => aoBuscar(e.target.value)}
            placeholder={t("Buscar")}
            className="h-8 w-full rounded-[6px] border-0 bg-casca-raia pr-8 pl-3 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-suave"
          />
          <Search size={16} aria-hidden className="pointer-events-none absolute top-2 right-2.5 text-casca-suave" />
        </label>
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {modelos.isLoading ? (
          <ul aria-busy className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ESQUELETOS.map((n) => (
              <li key={n} data-testid="esqueleto-do-modelo" className="animate-pulse overflow-hidden rounded-[6px] border border-casca-borda">
                <div className="h-32 bg-casca-raia" />
                <div className="h-14 bg-casca-raia/60" />
              </li>
            ))}
          </ul>
        ) : modelos.isError ? (
          <ErroDaLista mensagem={t("Erro inesperado.")} aoTentar={() => void modelos.refetch()} />
        ) : visiveis.length === 0 ? (
          <div className="grid h-full place-items-center">
            <div className="flex flex-col items-center">
              <span className="grid size-14 place-items-center rounded-[12px] bg-casca-marca-suave text-casca-marca">
                <LayoutTemplate size={24} strokeWidth={1.5} aria-hidden />
              </span>
              <p className="mt-4 text-[14px] font-semibold text-casca-texto">{t("Nenhum template encontrado")}</p>
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visiveis.map((m) => (
              <CardDoModelo key={`${m.origem}:${m.id}`} modelo={m} aoUsar={aoUsar} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
