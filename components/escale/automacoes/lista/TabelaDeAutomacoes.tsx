"use client";
import type { ReactNode } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type {
  AgenteDaLista,
  AutomacaoDaLista,
  ColunaDeOrdem,
  Ordem,
  PastaDeAutomacao,
} from "@/lib/escale/automacoes/tipos";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { LinhaDaAutomacao } from "./LinhaDaAutomacao";
import {
  ErroDasAutomacoes,
  EsqueletoDasAutomacoes,
  VazioDoFiltroDeAutomacoes,
  VazioSemAutomacoes,
} from "./VaziosDasAutomacoes";

const TH = "px-3 text-left text-[10px] font-semibold tracking-[0.1em] text-casca-texto uppercase";

function Ordenavel({
  coluna,
  ordem,
  aoOrdenar,
  rotulo,
  rotuloOculto,
}: {
  coluna: ColunaDeOrdem;
  ordem: Ordem;
  aoOrdenar: (c: ColunaDeOrdem) => void;
  rotulo: string;
  rotuloOculto?: boolean;
}) {
  const ativa = ordem.coluna === coluna;
  const Seta = !ativa ? ChevronsUpDown : ordem.direcao === "asc" ? ChevronUp : ChevronDown;
  return (
    <button type="button" onClick={() => aoOrdenar(coluna)} className="inline-flex items-center gap-1.5 uppercase">
      <span className={cn(rotuloOculto && "sr-only")}>{rotulo}</span>
      <Seta size={11} aria-hidden className="text-casca-chevron" />
    </button>
  );
}

/** A tabela (07-001): cabeçalho fixo e ordenável, corpo e os estados vazio, erro e carregando. */
export function TabelaDeAutomacoes({
  itens,
  carregando,
  erro,
  vazioPorFiltro,
  ordem,
  aoOrdenar,
  selecionadas,
  aoSelecionar,
  aoSelecionarPagina,
  pastas,
  agentes,
  fuso,
  aoEditar,
  aoRenomear,
  aoCriar,
  aoLimparFiltros,
  aoTentarDeNovo,
}: {
  itens: readonly AutomacaoDaLista[];
  carregando: boolean;
  erro: boolean;
  /** O vazio é só por causa do filtro de Status ou de Agente. */
  vazioPorFiltro: boolean;
  ordem: Ordem;
  aoOrdenar: (c: ColunaDeOrdem) => void;
  selecionadas: ReadonlySet<string>;
  aoSelecionar: (id: string) => void;
  aoSelecionarPagina: (ids: readonly string[], marcar: boolean) => void;
  pastas: readonly PastaDeAutomacao[];
  agentes: ReadonlyMap<string, AgenteDaLista>;
  fuso: string;
  aoEditar: (id: string) => void;
  aoRenomear: (a: AutomacaoDaLista) => void;
  aoCriar: () => void;
  aoLimparFiltros: () => void;
  aoTentarDeNovo: () => void;
}) {
  const t = useT();
  const ids = itens.map((a) => a.id);
  const marcadas = ids.filter((id) => selecionadas.has(id)).length;
  const caixa: boolean | "indeterminada" = marcadas === 0 ? false : marcadas === ids.length ? true : "indeterminada";
  const aria = (c: ColunaDeOrdem) => (ordem.coluna !== c ? "none" : ordem.direcao === "asc" ? "ascending" : "descending");

  let corpo: ReactNode;
  if (carregando) corpo = <EsqueletoDasAutomacoes />;
  else if (erro) corpo = <ErroDasAutomacoes aoTentarDeNovo={aoTentarDeNovo} />;
  else if (itens.length === 0)
    corpo = vazioPorFiltro ? <VazioDoFiltroDeAutomacoes aoLimpar={aoLimparFiltros} /> : <VazioSemAutomacoes aoCriar={aoCriar} />;
  else
    corpo = itens.map((a) => (
      <LinhaDaAutomacao
        key={a.id}
        automacao={a}
        pastas={pastas}
        agentes={agentes}
        fuso={fuso}
        selecionada={selecionadas.has(a.id)}
        aoSelecionar={() => aoSelecionar(a.id)}
        aoEditar={aoEditar}
        aoRenomear={aoRenomear}
      />
    ));

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-14" />
          <col />
          <col className="w-60" />
          <col className="w-[72px]" />
          <col className="w-[200px]" />
          <col className="w-11" />
          <col className="w-11" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="h-[52px] border-b border-casca-divisoria">
            <th scope="col" className="pl-6 text-left">
              <CaixaDaCasca
                marcada={caixa}
                aoMudar={(m) => aoSelecionarPagina(ids, m)}
                aria-label={t("Selecionar todas as automações da página")}
                desabilitada={ids.length === 0}
              />
            </th>
            <th scope="col" aria-sort={aria("nome")} className={TH}>
              <Ordenavel coluna="nome" ordem={ordem} aoOrdenar={aoOrdenar} rotulo={t("Nome")} />
            </th>
            <th scope="col" className={TH}>
              {t("Agente")}
            </th>
            <th scope="col" aria-sort={aria("status")} className={TH}>
              <Ordenavel coluna="status" ordem={ordem} aoOrdenar={aoOrdenar} rotulo={t("Status")} rotuloOculto />
            </th>
            <th scope="col" aria-sort={aria("atualizada")} className={TH}>
              <Ordenavel coluna="atualizada" ordem={ordem} aoOrdenar={aoOrdenar} rotulo={t("Última alteração")} />
            </th>
            <th scope="col" />
            <th scope="col" />
          </tr>
        </thead>
        <tbody aria-busy={carregando || undefined}>{corpo}</tbody>
      </table>
    </div>
  );
}
