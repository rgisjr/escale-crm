"use client";
import { useT } from "@/hooks/i18n/useT";
import type { Ordem } from "@/lib/escale/conversas/ordem";
import type { Preset } from "@/lib/escale/conversas/presets";
import { Funnel, Search } from "@/lib/ui/icons-da-casca";

import { MenuDeOrdem, BOTAO_DA_BARRA } from "./MenuDeOrdem";
import { MenuDePresets } from "./MenuDePresets";
import { MenuMaisDaFila } from "./MenuMaisDaFila";

/** A busca e a barra da fila (c01): preset à esquerda; funil (3D), ordem e ⋮ à direita. */
export function BarraDaFila({
  busca,
  aoBuscar,
  preset,
  aoMudarPreset,
  ordem,
  aoMudarOrdem,
  espiao,
  aoMudarEspiao,
  personalizando,
  aoPersonalizar,
  visualizacaoForaDoPadrao,
}: {
  busca: string;
  aoBuscar: (v: string) => void;
  preset: Preset;
  aoMudarPreset: (p: Preset) => void;
  ordem: Ordem;
  aoMudarOrdem: (o: Ordem) => void;
  espiao: boolean;
  aoMudarEspiao: (v: boolean) => void;
  personalizando: boolean;
  aoPersonalizar: () => void;
  visualizacaoForaDoPadrao: boolean;
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
        <MenuDePresets preset={preset} aoMudar={aoMudarPreset} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title={t("Em breve")}
            aria-label={t("Filtros")}
            className={BOTAO_DA_BARRA}
          >
            <Funnel size={16} aria-hidden />
          </button>
          <MenuDeOrdem ordem={ordem} aoMudar={aoMudarOrdem} />
          <MenuMaisDaFila
            espiao={espiao}
            aoMudarEspiao={aoMudarEspiao}
            aoPersonalizar={aoPersonalizar}
            foraDoPadrao={visualizacaoForaDoPadrao}
          />
        </div>
      </div>
      {personalizando ? <span className="sr-only">{t("Personalizar visualização")}</span> : null}
    </div>
  );
}
