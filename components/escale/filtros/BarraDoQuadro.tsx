"use client";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/i18n/useT";
import type { CampoFiltravel } from "@/lib/escale/filtros/campos";
import type { AlvoDoFiltro } from "@/lib/escale/filtros/filtros-salvos";
import { limparCriterios, type FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import type { Lead } from "@/lib/types/leads";
import { ArrowsClockwise } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import { MenuDeFiltrosSalvos } from "./MenuDeFiltrosSalvos";
import { OrdenarCards } from "./OrdenarCards";
import { PainelDeFiltros } from "./PainelDeFiltros";
import { ResumoDosFiltros } from "./ResumoDosFiltros";
import { StatusDoQuadro } from "./StatusDoQuadro";

export interface BarraDoQuadroProps {
  alvo: AlvoDoFiltro;
  filtros: FiltrosDoQuadro;
  /** O filtro salvo aplicado (fica aplicado enquanto a pessoa ajusta: vira "alterado"). */
  filtroSalvoId: string | null;
  onMudar: (filtros: FiltrosDoQuadro, filtroSalvoId: string | null) => void;
  /** Todos os cards, SEM filtro: é deles que saem as opções de tags e de motivos. */
  leads: readonly Lead[];
  campos: readonly CampoFiltravel[];
  settings?: Record<string, unknown>;
  /** Quantos negócios o quadro mostra agora (Clint: "21 Negócios"). */
  contagem: number;
  onAtualizar: () => void;
  atualizando?: boolean;
}

const ESPERA_DA_BUSCA_MS = 250;

/**
 * A BARRA DO QUADRO (fork Escale, Fase 1D; ficha 01-020 da Clint): busca,
 * status, Filtros, filtros salvos, a contagem, Ordenar e Atualizar. Embaixo, o
 * resumo dos filtros ativos, visível com o painel fechado.
 */
export function BarraDoQuadro({
  alvo,
  filtros,
  filtroSalvoId,
  onMudar,
  leads,
  campos,
  settings,
  contagem,
  onAtualizar,
  atualizando = false,
}: BarraDoQuadroProps) {
  const t = useT();
  // Muda só quando os filtros vêm de fora da digitação (filtro salvo, limpar):
  // é o que reinicia a caixa de busca com o texto novo.
  const [geracao, setGeracao] = useState(0);
  const mudar = useCallback((proximos: FiltrosDoQuadro) => onMudar(proximos, filtroSalvoId), [onMudar, filtroSalvoId]);
  const buscar = useCallback((busca: string) => mudar({ ...filtros, busca: busca || undefined }), [mudar, filtros]);

  function trocarTudo(proximos: FiltrosDoQuadro, salvoId: string | null) {
    setGeracao((g) => g + 1);
    onMudar(proximos, salvoId);
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-2">
      <div className="flex flex-wrap items-center gap-2">
        <CampoDeBusca
          key={geracao}
          atual={filtros.busca ?? ""}
          onBuscar={buscar}
          placeholder={alvo.tipo === "origem" ? t("Pesquisar nessa origem…") : t("Pesquisar nessa visualização…")}
        />
        <StatusDoQuadro status={filtros.status} onMudar={(status) => mudar({ ...filtros, status })} />
        <PainelDeFiltros filtros={filtros} onMudar={mudar} leads={leads} campos={campos} settings={settings} />
        <MenuDeFiltrosSalvos alvo={alvo} filtros={filtros} filtroSalvoId={filtroSalvoId} onAplicar={trocarTudo} />
        <div className="ml-auto flex items-center gap-1">
          <span className="px-2 text-sm text-muted-foreground" aria-live="polite">
            {(contagem === 1 ? t("{n} negócio") : t("{n} negócios")).replace("{n}", String(contagem))}
          </span>
          <OrdenarCards ordem={filtros.ordem} campos={campos} onAplicar={(ordem) => mudar({ ...filtros, ordem })} />
          <Button variant="ghost" size="sm" onClick={onAtualizar} disabled={atualizando} aria-label={t("Atualizar")} title={t("Atualizar")}>
            <ArrowsClockwise size={16} className={cn(atualizando && "animate-spin")} aria-hidden />
          </Button>
        </div>
      </div>
      <ResumoDosFiltros filtros={filtros} onMudar={mudar} onLimpar={() => trocarTudo(limparCriterios(filtros), null)} />
      {filtros.ordem?.length ? (
        <p className="px-1 text-xs text-muted-foreground">
          {t("Ordenação ativa · arrastar para reordenar dentro da coluna está desabilitado. Mover de etapa continua funcionando.")}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A busca espera a pessoa parar de digitar (250ms, o mesmo do `FilterBar` do
 * original). Compara com o valor de FORA (`atual`): depois que a URL muda, o
 * efeito roda de novo e para, sem mandar a mesma busca duas vezes.
 */
function CampoDeBusca({ atual, placeholder, onBuscar }: { atual: string; placeholder: string; onBuscar: (busca: string) => void }) {
  const [valor, setValor] = useState(atual);
  useEffect(() => {
    if (valor === atual) return;
    const id = setTimeout(() => onBuscar(valor), ESPERA_DA_BUSCA_MS);
    return () => clearTimeout(id);
  }, [valor, atual, onBuscar]);
  return (
    <Input
      type="search"
      placeholder={placeholder}
      aria-label={placeholder}
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      className="h-9 w-full sm:w-64"
    />
  );
}
