"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import type { Ordem } from "@/lib/escale/conversas/ordem";
import { totalDeCriterios, type FiltrosDoPainel } from "@/lib/escale/conversas/filtros-da-fila";
import { Search, Settings, SquarePen } from "@/lib/ui/icons-da-casca";

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
  aoNovaConversa,
  novaAberta,
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
  aoNovaConversa: () => void;
  novaAberta: boolean;
}) {
  const t = useT();
  return (
    <div className="shrink-0 border-b border-casca-borda">
      <div className="flex h-14 items-center gap-2 border-b border-casca-borda px-4">
        <Search size={20} aria-hidden className="shrink-0 text-casca-texto" />
        <input
          type="search"
          value={busca}
          onChange={(e) => aoBuscar(e.target.value)}
          placeholder={t("Pesquisar")}
          aria-label={t("Pesquisar")}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-none"
        />
        <Link
          href="/app/inbox/configuracoes"
          aria-label={t("Configurações")}
          title={t("Configurações")}
          className="grid size-8 shrink-0 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
        >
          <Settings size={18} aria-hidden />
        </Link>
      </div>
      <div className="flex h-14 items-center justify-between px-4">
        <MenuDePresets
          painel={painel}
          aoMudarPainel={aoMudarPainel}
          aoCriarFiltro={aoCriarFiltro}
          temGrupos={temGrupos}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t("Nova conversa")}
            title={t("Nova conversa")}
            aria-pressed={novaAberta}
            onClick={aoNovaConversa}
            className={`grid size-8 place-items-center rounded-casca-gatilho hover:bg-casca-raia ${novaAberta ? "bg-casca-marca-suave text-casca-marca" : "text-casca-suave"}`}
          >
            <SquarePen size={18} aria-hidden />
          </button>
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
