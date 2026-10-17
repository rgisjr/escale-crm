"use client";
import { useCallback, useEffect, useState } from "react";

import { PersonalizarCards } from "@/components/escale/capa/PersonalizarCards";
import { useT } from "@/hooks/i18n/useT";
import type { CampoFiltravel } from "@/lib/escale/filtros/campos";
import type { AlvoDoFiltro } from "@/lib/escale/filtros/filtros-salvos";
import { limparCriterios, temCriterios, type FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import type { Lead } from "@/lib/types/leads";
import { Search, X } from "@/lib/ui/icons-da-casca";

import { BotaoOrdenar } from "./BotaoOrdenar";
import { CLASSE_DA_LINHA_DO_MENU } from "./controles";
import { ExportarCards, type ExportacaoDoQuadro } from "./ExportarCards";
import { FiltroDeData } from "./FiltroDeData";
import {
  GatilhoDeCampos,
  GatilhoDeTags,
  GatilhoDoDono,
  GatilhoMaisFiltros,
} from "./GatilhosDoQuadro";
import { LinhaDeContagem } from "./LinhaDeContagem";
import { MenuDeFiltrosSalvos } from "./MenuDeFiltrosSalvos";
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
  /** Quantos negócios o quadro mostra agora. */
  contagem: number;
  onAtualizar: () => void;
  atualizando?: boolean;
  /** Fase 1E: o que o ícone Exportar leva; ausente = sem ícone (Visualização, abaixo de gerente). */
  exportacao?: ExportacaoDoQuadro;
}

const ESPERA_DA_BUSCA_MS = 250;

/**
 * A BARRA DO QUADRO DA CASCA (fork Escale, Fase 1D; visual da Clint na Casca V4:
 * 01-010 e o print da barra de 15/10). Linha 1: a busca e os seis gatilhos, na
 * ordem da Clint. Linha 2: a contagem e as ações. Os critérios ativos aparecem
 * no selo de cada gatilho (D4).
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
  exportacao,
}: BarraDoQuadroProps) {
  const t = useT();
  // Muda só quando os filtros vêm de fora da digitação (filtro salvo, limpar):
  // é o que reinicia a caixa de busca com o texto novo.
  const [geracao, setGeracao] = useState(0);
  const mudar = useCallback(
    (proximos: FiltrosDoQuadro) => onMudar(proximos, filtroSalvoId),
    [onMudar, filtroSalvoId],
  );
  const buscar = useCallback(
    (busca: string) => mudar({ ...filtros, busca: busca || undefined }),
    [mudar, filtros],
  );

  function trocarTudo(proximos: FiltrosDoQuadro, salvoId: string | null) {
    setGeracao((g) => g + 1);
    onMudar(proximos, salvoId);
  }

  return (
    <div className="mt-4 flex flex-col gap-6" data-barra-do-quadro>
      <div role="group" aria-label={t("Filtros")} className="flex flex-wrap items-center gap-3.5">
        <CampoDeBusca
          key={geracao}
          atual={filtros.busca ?? ""}
          onBuscar={buscar}
          rotulo={
            alvo.tipo === "origem"
              ? t("Pesquisar nessa origem…")
              : t("Pesquisar nessa visualização…")
          }
        />
        <FiltroDeData filtros={filtros} onMudar={mudar} />
        <GatilhoDeCampos filtros={filtros} onMudar={mudar} campos={campos} />
        <GatilhoDeTags filtros={filtros} onMudar={mudar} leads={leads} />
        <GatilhoDoDono filtros={filtros} onMudar={mudar} />
        <StatusDoQuadro
          status={filtros.status}
          onMudar={(status) => mudar({ ...filtros, status })}
        />
        <GatilhoMaisFiltros
          filtros={filtros}
          onMudar={mudar}
          leads={leads}
          settings={settings}
          // FORK ESCALE · Fase 1E (E15): "Filtros salvos" e "Limpar filtros" saíram do menu da engrenagem.
          rodape={
            <div>
              <MenuDeFiltrosSalvos
                alvo={alvo}
                filtros={filtros}
                filtroSalvoId={filtroSalvoId}
                onAplicar={trocarTudo}
              />
              <button
                type="button"
                disabled={!temCriterios(filtros)}
                onClick={() => trocarTudo(limparCriterios(filtros), null)}
                className={CLASSE_DA_LINHA_DO_MENU}
              >
                <X size={14} aria-hidden />
                {t("Limpar filtros")}
              </button>
            </div>
          }
        />
      </div>
      <LinhaDeContagem
        contagem={contagem}
        ordemAtiva={Boolean(filtros.ordem?.length)}
        onAtualizar={onAtualizar}
        atualizando={atualizando}
        // FORK ESCALE · Fase 1E: o ícone "Personalizar cards", logo depois do atualizar.
        personalizar={<PersonalizarCards campos={campos} />}
        // FORK ESCALE · Fase 1E: o ícone Exportar (gerente ou acima, só no funil).
        exportar={exportacao ? <ExportarCards {...exportacao} /> : undefined}
        // FORK ESCALE · Fase 1E (E15): "Ordenar" é botão da linha de contagem; a engrenagem fica para a 1F.
        ordenar={
          <BotaoOrdenar
            ordem={filtros.ordem}
            campos={campos}
            onAplicar={(ordem) => mudar({ ...filtros, ordem })}
          />
        }
      />
    </div>
  );
}

/**
 * A busca da Clint (design system §6.4): 109×32, fundo claro, sem borda e sem
 * placeholder, lupa à direita. Espera a pessoa parar de digitar (250ms, o mesmo
 * do `FilterBar` do original) e compara com o valor de FORA (`atual`).
 */
function CampoDeBusca({
  atual,
  rotulo,
  onBuscar,
}: {
  atual: string;
  rotulo: string;
  onBuscar: (busca: string) => void;
}) {
  const [valor, setValor] = useState(atual);
  useEffect(() => {
    if (valor === atual) return;
    const id = setTimeout(() => onBuscar(valor), ESPERA_DA_BUSCA_MS);
    return () => clearTimeout(id);
  }, [valor, atual, onBuscar]);
  return (
    <div className="relative h-8 w-[109px] shrink-0">
      <input
        type="search"
        aria-label={rotulo}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="h-8 w-full rounded-casca-gatilho border-0 bg-casca-busca pr-7 pl-2.5 text-xs text-casca-texto outline-hidden focus:ring-1 focus:ring-casca-marca [&::-webkit-search-cancel-button]:hidden"
      />
      <Search
        size={16}
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-casca-suave"
      />
    </div>
  );
}
