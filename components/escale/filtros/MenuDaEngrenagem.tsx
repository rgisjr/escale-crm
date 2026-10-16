"use client";
import { useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import type { CampoFiltravel } from "@/lib/escale/filtros/campos";
import type { AlvoDoFiltro } from "@/lib/escale/filtros/filtros-salvos";
import { limparCriterios, temCriterios, type FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { Settings, SlidersHorizontal, X } from "@/lib/ui/icons-da-casca";

import { CLASSE_DA_LINHA_DO_MENU } from "./controles";
import { MenuDeFiltrosSalvos } from "./MenuDeFiltrosSalvos";
import { OrdenarCards } from "./OrdenarCards";

/**
 * A ENGRENAGEM DA LINHA DE AÇÕES (fork Escale, Casca V4; D5). A Clint superior
 * não mostra o que ela abre (PRINT 15). Aqui moram o que a 1D já entregou e a
 * variante superior não mostra: Ordenar e Filtros salvos (PRINTS 31 e 32), mais
 * "Limpar filtros" e "Personalizar cards", desligado até a 1E (PRINT 33).
 */
export function MenuDaEngrenagem({
  alvo,
  filtros,
  filtroSalvoId,
  campos,
  onMudar,
  onTrocarTudo,
}: {
  alvo: AlvoDoFiltro;
  filtros: FiltrosDoQuadro;
  filtroSalvoId: string | null;
  campos: readonly CampoFiltravel[];
  onMudar: (filtros: FiltrosDoQuadro) => void;
  /** Troca filtros e filtro salvo de uma vez (aplicar um salvo, limpar tudo). */
  onTrocarTudo: (filtros: FiltrosDoQuadro, filtroSalvoId: string | null) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <BotaoDaCasca
          type="button"
          variante="icone"
          aria-label={t("Configurações do quadro")}
          title={t("Configurações do quadro")}
        >
          <Settings size={16} aria-hidden />
        </BotaoDaCasca>
      </PopoverTrigger>
      <PainelSuspenso
        align="end"
        sideOffset={8}
        aria-label={t("Configurações do quadro")}
        className="w-56 p-1"
      >
        <OrdenarCards
          ordem={filtros.ordem}
          campos={campos}
          onAplicar={(ordem) => onMudar({ ...filtros, ordem })}
        />
        <MenuDeFiltrosSalvos
          alvo={alvo}
          filtros={filtros}
          filtroSalvoId={filtroSalvoId}
          onAplicar={onTrocarTudo}
        />
        <button
          type="button"
          disabled={!temCriterios(filtros)}
          onClick={() => onTrocarTudo(limparCriterios(filtros), null)}
          className={CLASSE_DA_LINHA_DO_MENU}
        >
          <X size={14} aria-hidden />
          {t("Limpar filtros")}
        </button>
        <div className="my-1 h-px bg-casca-borda" aria-hidden />
        <button type="button" disabled title={t("Em breve")} className={CLASSE_DA_LINHA_DO_MENU}>
          <SlidersHorizontal size={14} aria-hidden />
          {t("Personalizar cards")}
        </button>
      </PainelSuspenso>
    </Popover>
  );
}
