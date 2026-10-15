"use client";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";
import {
  criteriosAtivos,
  removerCriterio,
  type CriterioAtivo,
  type FiltrosDoQuadro,
} from "@/lib/escale/filtros/tipos";
import { X } from "@/lib/ui/icons";

/**
 * O RESUMO DOS FILTROS ATIVOS, visível com o painel fechado (ficha 01-018: "o
 * resumo de filtros ativos precisa permanecer visível quando o painel fechar").
 * Cada chip sai pelo X; "Limpar filtros" tira todos e solta o filtro salvo.
 */
export function ResumoDosFiltros({
  filtros,
  onMudar,
  onLimpar,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
  onLimpar: () => void;
}) {
  const t = useT();
  const ativos = criteriosAtivos(filtros);
  if (ativos.length === 0) return null;

  const rotulo = (c: CriterioAtivo) => {
    const n = String(c.n ?? 0);
    if (c.id === "tags") return (c.n === 1 ? t("{n} tag") : t("{n} tags")).replace("{n}", n);
    if (c.id === "campos") return (c.n === 1 ? t("{n} campo") : t("{n} campos")).replace("{n}", n);
    return t(c.rotulo);
  };

  return (
    <div
      role="group"
      aria-label={t("Filtros ativos")}
      className="flex flex-wrap items-center gap-2"
    >
      {ativos.map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs"
        >
          {rotulo(c)}
          <button
            type="button"
            aria-label={`${t("Remover filtro")}: ${rotulo(c)}`}
            onClick={() => onMudar(removerCriterio(filtros, c.id))}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={12} aria-hidden />
          </button>
        </span>
      ))}
      <Button variant="ghost" size="sm" onClick={onLimpar}>
        {t("Limpar filtros")}
      </Button>
    </div>
  );
}
