"use client";
import { useT } from "@/hooks/i18n/useT";
import type { Ordem } from "@/lib/escale/conversas/ordem";
import { totalDeCriterios, type FiltrosDoPainel } from "@/lib/escale/conversas/filtros-da-fila";
import { Search } from "@/lib/ui/icons-da-casca";

import { FunilDaFila } from "../filtros/FunilDaFila";
import { MenuDeOrdem } from "./MenuDeOrdem";
import { MenuDePresets } from "./MenuDePresets";
import { MenuMaisDaFila } from "./MenuMaisDaFila";

/** A busca e a barra da fila (c01): preset à esquerda; funil, ordem e ⋮ à direita (FORK ESCALE · Fase 3D). */
export function BarraDaFila({
  busca,
  aoBuscar,
  painel,
  aoMudarPainel,
  filtrosAbertos,
  aoAlternarFiltros,
  aoCriarFiltro,
  temGrupos,
  ordem,
  aoMudarOrdem,
  espiao,
  aoMudarEspiao,
  personalizando,
  aoPersonalizar,
  visualizacaoForaDoPadrao,
  podeSelecionar,
  aoSelecionar,
}: {
  busca: string;
  aoBuscar: (v: string) => void;
  painel: FiltrosDoPainel;
  aoMudarPainel: (f: FiltrosDoPainel) => void;
  filtrosAbertos: boolean;
  aoAlternarFiltros: () => void;
  aoCriarFiltro: () => void;
  temGrupos: boolean;
  ordem: Ordem;
  aoMudarOrdem: (o: Ordem) => void;
  espiao: boolean;
  aoMudarEspiao: (v: boolean) => void;
  personalizando: boolean;
  aoPersonalizar: () => void;
  visualizacaoForaDoPadrao: boolean;
  podeSelecionar: boolean;
  aoSelecionar: () => void;
}) {
  const t = useT();
  return (
    <div className="shrink-0 px-3 pt-3 pb-4">
      <label className="relative block">
        <input
          type="search"
          value={busca}
          onChange={(e) => aoBuscar(e.target.value)}
          placeholder={t("Pesquisar")}
          aria-label={t("Pesquisar")}
          className="h-8 w-full rounded-casca-gatilho bg-casca-busca pr-8 pl-3 text-[12px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
        />
        <Search
          size={16}
          aria-hidden
          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave"
        />
      </label>
      <div className="mt-5 flex h-8 items-center justify-between">
        <MenuDePresets
          painel={painel}
          aoMudarPainel={aoMudarPainel}
          aoCriarFiltro={aoCriarFiltro}
          temGrupos={temGrupos}
        />
        <div className="flex items-center gap-2">
          <FunilDaFila
            total={totalDeCriterios(painel)}
            ativo={filtrosAbertos}
            aoAlternar={aoAlternarFiltros}
          />
          <MenuDeOrdem ordem={ordem} aoMudar={aoMudarOrdem} />
          <MenuMaisDaFila
            espiao={espiao}
            aoMudarEspiao={aoMudarEspiao}
            aoPersonalizar={aoPersonalizar}
            foraDoPadrao={visualizacaoForaDoPadrao}
            podeSelecionar={podeSelecionar}
            aoSelecionar={aoSelecionar}
          />
        </div>
      </div>
      {personalizando ? <span className="sr-only">{t("Personalizar visualização")}</span> : null}
    </div>
  );
}
