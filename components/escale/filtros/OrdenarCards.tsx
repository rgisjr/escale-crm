"use client";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useT } from "@/hooks/i18n/useT";
import type { CampoFiltravel } from "@/lib/escale/filtros/campos";
import { GRUPOS_DE_ORDEM, opcoesDeOrdem, rotulosDaDirecao } from "@/lib/escale/filtros/ordenar";
import { CRITERIOS_DE_ORDEM_MAX, type CriterioDeOrdem } from "@/lib/escale/filtros/tipos";
import { ArrowsDownUp, Plus, X } from "@/lib/ui/icons";

import { classeDoSeletor } from "./controles";

/**
 * "ORDENAR POR" (fork Escale, Fase 1D; textos da Clint, `DealSortControl`): um
 * ou mais critérios (até 3), a ordem das linhas é a prioridade, e nada muda até
 * "Aplicar". Aplicar sem critério volta à ordem manual.
 */
export function OrdenarCards({
  ordem,
  campos,
  onAplicar,
}: {
  ordem: readonly CriterioDeOrdem[] | undefined;
  campos: readonly CampoFiltravel[];
  onAplicar: (ordem: CriterioDeOrdem[] | undefined) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<CriterioDeOrdem[]>([]);
  const opcoes = useMemo(() => opcoesDeOrdem(campos), [campos]);
  const porCampo = new Map(opcoes.map((o) => [o.campo, o]));
  const livre = opcoes.find((o) => !rascunho.some((r) => r.campo === o.campo));
  const cheio = rascunho.length >= CRITERIOS_DE_ORDEM_MAX;
  // Com campos personalizados a lista cresce: a caixa tem busca (`SearchableSelect`), e o nome do
  // grupo entra como palavra-chave, para "Negócio" achar os do negócio.
  const rotuloDoGrupo = new Map(GRUPOS_DE_ORDEM.map((g) => [g.grupo, t(g.rotulo)]));
  const opcoesDaCaixa = opcoes.map((o) => ({
    value: o.campo,
    label: o.grupo === "campos" ? o.rotulo : t(o.rotulo),
    keywords: [rotuloDoGrupo.get(o.grupo) ?? ""],
  }));

  function abrir(sim: boolean) {
    if (sim) setRascunho([...(ordem ?? [])]);
    setAberto(sim);
  }

  function trocar(indice: number, novo: CriterioDeOrdem | null) {
    setRascunho((antes) => (novo === null ? antes.filter((_, j) => j !== indice) : antes.map((r, j) => (j === indice ? novo : r))));
  }

  return (
    <Popover open={aberto} onOpenChange={abrir}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowsDownUp size={16} aria-hidden />
          {t("Ordenar")}
          {ordem?.length ? <span className="rounded-full bg-accent/15 px-1.5 text-xs text-accent">{ordem.length}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label={t("Ordenar por")} className="w-[min(30rem,calc(100vw-2rem))] space-y-3">
        <div>
          <p className="text-sm font-semibold">{t("Ordenar por")}</p>
          <p className="text-xs text-muted-foreground">{t("Defina um ou mais critérios. A ordem das linhas define a prioridade.")}</p>
        </div>
        {rascunho.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-3 text-center">
            <p className="text-sm font-medium">{t("Nenhum critério de ordenação")}</p>
            <p className="text-xs text-muted-foreground">{t("Adicione um critério para ordenar ou aplique para voltar à ordem manual.")}</p>
          </div>
        ) : (
          rascunho.map((criterio, indice) => {
            const opcao = porCampo.get(criterio.campo);
            const direcoes = rotulosDaDirecao(opcao?.tipo ?? "texto");
            return (
              <div key={indice} className="flex items-center gap-2">
                <SearchableSelect
                  aria-label={`${t("Campo")} ${indice + 1}`}
                  className="min-w-0 flex-1"
                  value={criterio.campo}
                  options={opcoesDaCaixa.map((o) => ({
                    ...o,
                    disabled: o.value !== criterio.campo && rascunho.some((r) => r.campo === o.value),
                  }))}
                  onValueChange={(campo) => trocar(indice, { campo, direcao: criterio.direcao })}
                />
                <select
                  aria-label={`${t("Direção")} ${indice + 1}`}
                  className={classeDoSeletor}
                  value={criterio.direcao}
                  onChange={(e) => trocar(indice, { campo: criterio.campo, direcao: e.target.value === "desc" ? "desc" : "asc" })}
                >
                  <option value="asc">{t(direcoes.asc)}</option>
                  <option value="desc">{t(direcoes.desc)}</option>
                </select>
                <button
                  type="button"
                  aria-label={`${t("Remover critério")} ${indice + 1}`}
                  onClick={() => trocar(indice, null)}
                  className="shrink-0 rounded-md px-2 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            );
          })
        )}
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!livre || cheio}
            onClick={() => {
              if (livre) setRascunho((antes) => [...antes, { campo: livre.campo, direcao: "asc" }]);
            }}
          >
            <Plus size={14} className="mr-1" aria-hidden />
            {t("Adicionar critério")}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
              {t("Cancelar")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onAplicar(rascunho.length > 0 ? rascunho : undefined);
                setAberto(false);
              }}
            >
              {t("Aplicar")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
