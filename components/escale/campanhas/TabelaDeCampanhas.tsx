"use client";
import { useState, type ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";
import { cn } from "@/lib/utils";

import { LinhaDaCampanha } from "./LinhaDaCampanha";
import { ErroDaLista, EsqueletoDaLista, VazioDoFiltro } from "./VaziosDasCampanhas";

const TH = "px-3 text-left text-[10px] font-semibold tracking-[0.1em] text-casca-texto uppercase";

/** A TABELA (002; PRD A5, A12): as colunas da Clint com "Número" no lugar de Conta e Dispositivo. */
export function TabelaDeCampanhas({
  linhas,
  carregando,
  erro,
  filtrando,
  fuso,
  agora,
  nomeDoNumero,
  aoLimparFiltros,
  aoTentarDeNovo,
}: {
  linhas: LinhaDeCampanha[];
  carregando: boolean;
  erro: boolean;
  filtrando: boolean;
  fuso?: string;
  /** Para o "há um mês" (o teste fixa; a tela usa a hora em que montou). */
  agora?: Date;
  nomeDoNumero: (id: string) => string;
  aoLimparFiltros: () => void;
  aoTentarDeNovo: () => void;
}) {
  const t = useT();
  const [instante] = useState(() => agora ?? new Date());
  let corpo: ReactNode;
  if (carregando) corpo = <EsqueletoDaLista />;
  else if (erro) corpo = <ErroDaLista aoTentarDeNovo={aoTentarDeNovo} />;
  else if (linhas.length === 0)
    corpo = filtrando ? <VazioDoFiltro aoLimpar={aoLimparFiltros} /> : null;
  else
    corpo = linhas.map((l) => (
      <LinhaDaCampanha
        key={l.id}
        linha={l}
        agora={instante}
        fuso={fuso}
        nomeDoNumero={nomeDoNumero(l.numeroId)}
      />
    ));

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[14%]" />
          <col className="w-[20%]" />
          <col className="w-[22%]" />
          <col className="w-[12%]" />
          <col className="w-[6%]" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="h-[42px] border-y border-casca-divisoria">
            <th scope="col" className={cn(TH, "pl-6")}>
              {t("Campanha")}
            </th>
            <th scope="col" className={TH}>
              {t("Data agendamento")}
            </th>
            <th scope="col" className={TH}>
              {t("Número")}
            </th>
            <th scope="col" className={TH}>
              {t("Resultado")}
            </th>
            <th scope="col" className={TH}>
              {t("Status")}
            </th>
            <th scope="col" className="pr-4">
              <span className="sr-only">{t("Ações")}</span>
            </th>
          </tr>
        </thead>
        <tbody aria-busy={carregando || undefined}>{corpo}</tbody>
      </table>
    </div>
  );
}
